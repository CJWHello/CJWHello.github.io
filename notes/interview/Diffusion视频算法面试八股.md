# Diffusion 视频算法面试八股

> 定位：面向快手可灵/字节 Seed/腾讯混元/阿里通义视频一线视频算法岗，重点围绕 **Diffusion 视频生成、low-level 视频处理、VAE/DiT、视频压缩与修复、以及你的两个项目经历** 准备。

---

# 第一部分：对应 JD 的面试八股

## 0. JD 拆解：面试官真正想确认什么

JD 关键词：

- **Diffusion 的 low-level 视频处理算法**：不是只会文生图/文生视频，还要理解降噪、超分、插帧、去模糊、低光增强、修复等图像/视频恢复问题。
- **网络架构设计：VAE 和 DiT**：要能讲清楚 latent diffusion 为什么依赖 VAE，DiT 为什么替代 UNet，以及视频场景下 temporal modeling 怎么做。
- **算法优化与保真性提升**：包括训练目标、采样策略、CFG、SNR weighting、数据质量、损失函数、reward/alignment、temporal consistency。
- **大规模数据处理**：视频数据清洗、切分、caption、质量筛选、运动筛选、去重、分辨率/帧率规范。
- **Diffusion 视频压缩和生成框架**：关注 latent 表示、视频 codec、rate-distortion、压缩感知生成、极低码率重建。
- **前沿视频修复技术落地**：不仅知道论文，还要能讲业务指标、速度、显存、鲁棒性。

你的个人匹配点：

- 项目一可以对应 **T2V diffusion 后训练、奖励设计、语义对齐、保真性与一致性评估**。
- 项目二可以对应 **长视频理解、多模态模型推理加速、视觉 token 剪枝、显存/延迟优化**。
- JD 中缺口是 **low-level 视频恢复、VAE/DiT、压缩**，需要用下面八股补强。

---

## 1. Diffusion 基础高频题

### Q1：DDPM 的训练和采样过程是什么？

**回答口径：**

DDPM 包含前向加噪和反向去噪两个过程。前向过程是固定的 Markov 链：

```text
q(x_t | x_{t-1}) = N(sqrt(alpha_t) x_{t-1}, (1 - alpha_t) I)
```

通过重参数化可以直接从干净样本得到任意时刻噪声样本：

```text
x_t = sqrt(alpha_bar_t) x_0 + sqrt(1 - alpha_bar_t) eps
```

训练时让网络预测噪声 `eps`、干净图像 `x0` 或 velocity `v`。最常见的是噪声预测：

```text
L = E || eps - eps_theta(x_t, t, c) ||^2
```

采样时从高斯噪声 `x_T` 开始，逐步根据网络预测的噪声反推 `x_{t-1}`，最终得到生成结果。

**面试官追问：为什么 diffusion 比 GAN 稳？**

- GAN 是 min-max 对抗训练，容易 mode collapse。
- Diffusion 是逐时刻 denoising regression，本质更接近有监督学习，优化更稳定。
- 代价是采样步骤多，速度慢，需要 DDIM、DPM-Solver、distillation、latent diffusion 等加速。

---

### Q2：预测 `eps`、`x0`、`v` 有什么区别？

**回答口径：**

- `eps-prediction`：经典 DDPM 形式，训练稳定，实现简单。
- `x0-prediction`：直接预测干净样本，更贴近重建目标，但高噪声阶段预测难度大。
- `v-prediction`：预测 noise 和 data 的线性组合，兼顾不同噪声强度下的数值稳定性，在高分辨率生成和视频生成中常用。

**可以补一句：**

视频 diffusion 里不同 timestep 的信噪比差异会影响运动一致性和细节恢复，所以经常配合 `v-prediction`、SNR reweighting 或 EDM/flow matching 类训练目标提升稳定性。

---

### Q3：Classifier-Free Guidance 是什么？为什么 guidance 太大反而不好？

**回答口径：**

CFG 同时训练条件和无条件分支，采样时用：

```text
eps = eps_uncond + s * (eps_cond - eps_uncond)
```

其中 `s` 是 guidance scale。它的作用是增强条件控制，比如文本一致性、图像条件一致性。

guidance 太大会导致：

- 过饱和、颜色异常、纹理发硬。
- 多样性下降。
- 视频里更容易出现闪烁、运动不自然。
- 可能牺牲真实感，模型过度追逐 prompt。

**项目挂钩：**

你的项目一中 GRPO 奖励优化和 CFG 都是在增强条件对齐，但 CFG 是采样阶段启发式增强，GRPO 是训练阶段改变策略分布。两者可以结合，但要防止 reward hacking 和过强 guidance 导致画面质量下降。

---

### Q4：Diffusion 里的 SNR weighting 是为了解决什么？

**回答口径：**

不同 timestep 的学习难度和梯度贡献不同。高噪声阶段偏语义结构，低噪声阶段偏细节纹理。如果所有 timestep 一样加权，模型可能过度关注某些噪声区间。

SNR weighting 根据：

```text
SNR(t) = alpha_bar_t / (1 - alpha_bar_t)
```

调整 loss 权重，让模型在语义结构和细节恢复之间更平衡。常见方法如 Min-SNR loss，会限制高 SNR timestep 的权重，改善训练效率和生成质量。

---

### Q5：DDIM 和 DDPM 采样有什么区别？

**回答口径：**

DDPM 是随机采样，每一步有噪声项；DDIM 构造了非马尔可夫的确定性采样路径，可以用更少步数完成采样。

- DDPM：多样性更强，但慢。
- DDIM：速度快、可复现性好，常用于 inversion、编辑、快速评估。
- 视频任务里采样步数减少可以显著降低成本，但过少步数可能损伤细节和时间一致性。

---

## 2. Video Diffusion 核心题

### Q1：视频 diffusion 相比图像 diffusion 难在哪里？

**回答口径：**

视频不仅要生成单帧质量，还要保证时间维度一致性。主要难点：

- **时间一致性**：主体身份、纹理、背景不能闪烁。
- **运动合理性**：动作要符合物理和语义，不能只是帧间随机扰动。
- **长程依赖**：长视频里前后情节、物体状态要连续。
- **计算量大**：视频 latent 是 `T × H × W`，attention 复杂度很高。
- **数据复杂**：视频质量、字幕质量、运动幅度、镜头切换都会影响训练。

**面试回答的高级点：**

图像 diffusion 主要建模空间分布 `p(x)`，视频 diffusion 要建模时空联合分布 `p(x_1, ..., x_T | c)`，而且时间维度上的错误会被人眼高度敏感地感知。

---

### Q2：视频 diffusion 常见架构有哪些？

**回答口径：**

常见有三类：

1. **2D UNet + Temporal Module**
   - 复用图像模型能力。
   - 在空间层后插入 temporal attention、temporal conv 或 motion module。
   - 优点是继承预训练图像模型，训练成本低。

2. **3D UNet**
   - 直接使用 3D convolution 或 3D attention 建模时空信息。
   - 时空一致性更直接，但计算量大。

3. **Video DiT**
   - 将视频 latent patchify 成 spatio-temporal tokens。
   - 用 Transformer 统一建模空间和时间。
   - 扩展性好，适合大模型和大数据训练，但算力需求更高。

---

### Q3：为什么现在视频生成越来越多用 DiT？

**回答口径：**

DiT 的核心优势是可扩展性。UNet 有强归纳偏置，适合中小规模图像生成；DiT 把 latent patch 当 token，用 Transformer 处理，更适合大模型 scaling。

DiT 的优势：

- 参数和数据规模扩大时收益明显。
- attention 更适合建模长程依赖。
- 文本、图像、视频 token 可以统一建模。
- 方便接入 RoPE、3D position embedding、cross-attention、多模态条件。

DiT 的挑战：

- 计算复杂度高。
- 对数据规模和训练稳定性要求更高。
- 视频 token 数量巨大，需要 sparse attention、window attention、token pruning 或 latent 压缩。

**项目挂钩：**

你的项目二做的是 Qwen2-VL 视觉 token 动态剪枝，虽然是理解模型，但思路可以迁移到 Video DiT：视频 token 数量巨大时，任务相关性/运动相关性可以辅助选择重要 token，降低 attention 成本。

---

### Q4：Video DiT 中时空位置编码怎么设计？

**回答口径：**

视频 token 同时有时间、空间高度、空间宽度三个坐标，所以位置编码通常要覆盖 `t, h, w`。

常见设计：

- 绝对 3D position embedding：简单，但长度外推能力弱。
- 分解式位置编码：`PE_t + PE_h + PE_w`，参数更省。
- 3D RoPE：适合 Transformer attention，具备一定相对位置建模能力。
- Temporal-aware RoPE：对时间维度单独设置频率，增强运动建模。

如果做长视频，还要考虑位置外推、分段生成和跨段记忆。

---

### Q5：视频 diffusion 如何保证 temporal consistency？

**回答口径：**

可以从模型、训练、数据、采样四个层面回答：

- **模型层面**：temporal attention、3D conv、motion module、spatio-temporal DiT。
- **训练层面**：加入 temporal consistency loss、flow consistency loss、跨帧感知损失。
- **数据层面**：过滤镜头切换、低质量、强压缩、字幕不匹配视频。
- **采样层面**：共享噪声、temporal CFG、滑窗重叠采样、前后段 latent 对齐。

如果面试官问“最关键是什么”，可以说：基础是数据和模型的时序建模能力，工程落地时还要靠采样策略和后处理控制闪烁。

---

## 3. VAE / Latent Diffusion 高频题

### Q1：为什么视频生成要用 VAE？

**回答口径：**

直接在 pixel space 做 diffusion 成本太高。VAE 把图像或视频压缩到 latent space，例如空间下采样 8 倍或更多，再在 latent 上做 diffusion。

好处：

- 显著降低计算量和显存。
- latent 空间更语义化，diffusion 更容易学习。
- 可以把生成模型和压缩/重建模块解耦。

代价：

- VAE 重建误差会限制最终画质上限。
- 容易损失高频纹理、小文字、人脸细节。
- 视频 VAE 还可能引入时间闪烁。

---

### Q2：图像 VAE 和视频 VAE 的区别？

**回答口径：**

图像 VAE 只压缩空间维度；视频 VAE 需要同时处理空间和时间维度。

视频 VAE 常见设计：

- **Frame-wise VAE**：逐帧编码，简单但时间一致性弱。
- **3D VAE**：使用 3D conv 同时压缩时间和空间，时序一致性更好。
- **Causal Video VAE**：只依赖当前和过去帧，适合流式生成或在线处理。
- **Temporal compression VAE**：对时间维度也下采样，降低 DiT token 数。

面试官可能追问：如果视频 VAE 压缩太狠会怎样？

- 细节丢失，恢复上限下降。
- 快速运动模糊。
- 小物体、小文字、人脸容易崩。
- 时间维度压缩过强会损害动作连续性。

---

### Q3：VAE 的 loss 怎么设计？

**回答口径：**

基础 VAE 包括重建损失和 KL loss：

```text
L = L_rec + beta * L_KL
```

生成模型里的 VAE 往往还会加入：

- `L1/L2` pixel 重建损失。
- LPIPS perceptual loss，提高感知质量。
- GAN loss，提高纹理真实感。
- Temporal consistency loss，减少视频闪烁。
- Frequency loss，增强高频细节。

关键 trade-off：

- KL 太强：latent 太接近高斯，重建细节差。
- KL 太弱：latent 分布不规整，后续 diffusion 难学。
- GAN 太强：纹理锐但可能不稳定。

---

### Q4：如何提升 VAE 的保真性？

**回答口径：**

- 提升 encoder/decoder 容量，尤其是 decoder 的高频恢复能力。
- 使用 perceptual loss 和 adversarial loss。
- 对人脸、文字、小物体做数据增强或重采样。
- 减小压缩倍率，但会增加 diffusion 成本。
- 引入 temporal loss，避免逐帧重建看着清楚但视频播放闪。
- 分层 latent 或残差 latent，让低频结构和高频细节分别建模。

---

## 4. Low-Level 视频处理高频题

### Q1：Diffusion 怎么用于图像/视频恢复？

**回答口径：**

恢复任务可以看成条件生成问题：

```text
p(x_clean | y_degraded)
```

其中 `y_degraded` 是退化输入，如低清、噪声、模糊、低光、压缩伪影。Diffusion 学习在条件约束下生成干净结果。

常见条件方式：

- degraded image/video concat 到输入。
- 用 encoder 提取 condition feature，再 cross-attention。
- ControlNet/T2I-Adapter 类结构。
- 在采样过程中加入 data consistency 约束。

---

### Q2：Diffusion 做恢复相比 CNN/Transformer restoration 有什么优缺点？

**回答口径：**

优点：

- 生成先验强，能补出自然纹理。
- 对严重退化、盲恢复、超分等 ill-posed 问题更有优势。
- 可以生成多种合理解。

缺点：

- 采样慢。
- 可能 hallucination，不一定忠于原图。
- 工业场景对稳定性和可控性要求高，需要保真约束。

一句总结：

传统 restoration 更偏确定性映射，diffusion restoration 更偏“条件生成 + 强先验”，核心难点是 **真实感和保真性的平衡**。

---

### Q3：超分任务中如何避免 diffusion 幻觉？

**回答口径：**

- 加强低分辨率输入约束，比如 encoder condition 或 cross-attention。
- 引入重建损失、感知损失、identity loss。
- 采样时加入 data consistency，把下采样后的结果约束回输入。
- 控制 guidance scale，避免过度生成。
- 对文字、人脸、小物体做专项数据和评估。
- 使用 reference-based 或 degradation-aware condition。

面试官喜欢的关键词：**fidelity-realism trade-off**。

---

### Q4：视频降噪/去模糊/低光增强的关键难点是什么？

**回答口径：**

共同难点是运动和时间一致性。

- **视频降噪**：噪声随机，不能把真实纹理当噪声抹掉；还要避免帧间闪烁。
- **去模糊**：运动模糊和失焦模糊退化不同，需要估计或隐式建模 blur kernel。
- **低光增强**：噪声、色偏、动态范围压缩同时存在，不能只提亮。
- **防抖/插帧**：强依赖运动估计，遮挡区域容易出错。

Diffusion 可以提供强先验，但必须配合 temporal modeling、光流/运动约束和保真损失。

---

### Q5：如何评价 low-level 视频算法？

**回答口径：**

客观指标：

- PSNR、SSIM：偏像素保真。
- LPIPS、DISTS：偏感知质量。
- FID/FVD：生成分布质量。
- NIQE/BRISQUE/MUSIQ：无参考质量评估。
- Warping error/tOF：时间一致性。

主观指标：

- 清晰度、闪烁、色彩、伪影、运动自然度。
- 业务 A/B test 或人工 MOS。

注意：

PSNR 高不一定视觉好，diffusion 方法通常要同时报告 fidelity 和 perceptual metrics。

---

## 5. 视频压缩与 Diffusion 生成框架

### Q1：视频压缩的传统框架是什么？

**回答口径：**

传统视频编码核心是：

- 帧内预测：利用空间相关性。
- 帧间预测：运动估计和运动补偿。
- 残差编码：只编码预测误差。
- 变换量化：DCT/类似变换后量化。
- 熵编码：利用概率模型进一步压缩。

优化目标是 rate-distortion：

```text
L = D + lambda * R
```

其中 `D` 是失真，`R` 是码率。

---

### Q2：神经视频压缩一般怎么做？

**回答口径：**

神经视频压缩通常用神经网络替代传统模块：

- learned image codec 做 I 帧压缩。
- optical flow 或 motion network 做运动估计。
- motion latent 和 residual latent 分别编码。
- entropy model 估计 latent 概率，计算码率。
- decoder 重建视频帧。

训练时联合优化 rate-distortion，有时加入 perceptual loss 或 GAN loss。

---

### Q3：Diffusion 和视频压缩怎么结合？

**回答口径：**

有几种思路：

1. **Diffusion as decoder prior**
   - 编码端只传低码率 latent 或条件。
   - 解码端用 diffusion 生成高质量重建。

2. **Residual diffusion**
   - 传统/神经 codec 得到基础重建。
   - diffusion 负责恢复残差细节和高频纹理。

3. **Generative compression**
   - 不追求像素级完全还原，而是在低码率下生成感知上合理的视频。
   - 适合人眼主观质量导向场景。

4. **Latent compression for video generation**
   - 用 VAE/video tokenizer 把视频压缩成 latent tokens。
   - 在压缩 latent 上训练 DiT，降低生成成本。

关键问题：

- 生成细节必须受码流约束，否则会“看着真但不忠实”。
- 低码率下要平衡 perceptual quality 和 fidelity。
- 视频场景还要保证 temporal consistency。

---

## 6. 大规模视频数据处理

### Q1：训练视频 diffusion 的数据 pipeline 怎么设计？

**回答口径：**

完整 pipeline：

1. 数据采集：公开视频、内部数据、授权素材。
2. 切分：按镜头/时长切 clip，过滤镜头切换。
3. 基础过滤：分辨率、帧率、时长、黑屏、重复帧、水印、字幕。
4. 质量评分：清晰度、美学、压缩伪影、曝光、运动幅度。
5. 文本标注：ASR/OCR/caption/VLM dense caption。
6. 去重：感知 hash、CLIP embedding、视频 embedding。
7. 分桶训练：按分辨率、宽高比、帧数、运动强度 bucket。
8. 安全过滤：版权、隐私、NSFW、敏感内容。

---

### Q2：为什么视频 caption 质量很关键？

**回答口径：**

视频生成是条件生成，如果 caption 和视频不匹配，模型会学到错误对应关系，直接影响 prompt following。

好的视频 caption 应包含：

- 主体：谁/什么物体。
- 动作：在做什么。
- 场景：在哪里。
- 镜头语言：远景、特写、推拉摇移。
- 时间变化：动作过程，而不是单帧描述。
- 风格：写实、动画、电影感等。

**项目挂钩：**

你的 GRPO 奖励系统就是在弥补“训练分布学得好但 prompt 对齐不足”的问题，本质上也是在优化文本-视频对齐。

---

## 7. 工程实现与训练优化

### Q1：训练视频 diffusion 为什么显存压力大？怎么优化？

**回答口径：**

显存主要来自：

- 视频 latent token 多。
- attention 中间激活大。
- batch、帧数、分辨率同时增长。
- optimizer state 和梯度占用。

优化方法：

- mixed precision：FP16/BF16。
- gradient checkpointing。
- ZeRO/DeepSpeed/FSDP。
- xFormers/FlashAttention。
- latent diffusion 降低空间分辨率。
- temporal/spatial window attention。
- gradient accumulation。
- LoRA 或 adapter 微调。

---

### Q2：视频生成模型如何做推理加速？

**回答口径：**

- 减少采样步数：DDIM、DPM-Solver、LCM、distillation。
- 降低 token 数：VAE 压缩、patch size、token pruning。
- 高效 attention：FlashAttention、window/sparse attention。
- 模型压缩：量化、蒸馏、LoRA merge、TensorRT。
- 缓存复用：KV cache、跨帧/跨步特征缓存。

**项目挂钩：**

项目二里的任务感知 token 剪枝直接对应“降低视觉 token 数和 attention 成本”，可以作为你对视频大模型推理优化的经验支撑。

---

# 第二部分：对应项目经历的面试八股

---

## 项目一：基于 GRPO 的文本视频生成奖励强化学习

### 1. 60 秒项目介绍

我这个项目是对 Wan2.1-T2V 文生视频扩散模型做后训练，目标是解决“画面质量不错，但视频内容和 prompt 不一致”的问题。传统 diffusion 主要优化噪声预测 loss，它能学习数据分布，但不能直接优化用户关心的语义对齐、动作合理性和整体一致性。

所以我引入 GRPO 强化学习：对同一个 prompt 采样多条视频，用奖励模型分别打分，再根据组内相对优势更新模型，让高奖励视频的生成概率上升。我主要负责奖励系统，包括 CLIP 视频级语义奖励、Qwen2-VL 四维细粒度奖励、结构化 JSON 输出、异常检测、重评分和奖励融合。最后形成了从 prompt 数据、GRPO 训练、LoRA 微调、DeepSpeed 分布式训练到自动评估的闭环。

---

### 2. 面试官会问：为什么 diffusion 的 MSE loss 不能保证 prompt 对齐？

**回答口径：**

噪声预测 loss 优化的是：

```text
E || eps - eps_theta(x_t, t, c) ||^2
```

它让模型学习条件数据分布，但这个 loss 并不显式衡量“生成视频是否满足 prompt”。尤其视频里存在多种合理解，MSE 更关注局部去噪准确性，而不是全局语义是否对齐。

举例：prompt 是“猫在雨中奔跑”，如果训练分布里相似 latent 的狗、静止猫、雨天背景都能降低 denoising loss，模型未必学到“猫 + 雨中 + 奔跑”三者都满足。

因此后训练要引入和用户目标更一致的 reward，比如文本-视频语义、动作、主体一致性、整体质量。

---

### 3. 面试官会问：GRPO 和 PPO 的区别是什么？为什么用 GRPO？

**回答口径：**

PPO 通常需要 value model 估计 advantage，而 GRPO 使用同一个 prompt 下多条样本的组内相对奖励来构造 advantage，不额外训练 value model。

简化理解：

```text
A_i = (r_i - mean(r_group)) / std(r_group)
```

优势：

- 省掉 value model，训练更轻。
- 对生成任务适合，因为同一 prompt 下多样本天然可以比较优劣。
- 奖励尺度经过组内归一化，更稳定。

在我的项目里，同一 prompt 会生成多条视频，奖励模型分别打分，GRPO 让高于组均值的视频获得正 advantage，低于组均值的视频获得负 advantage，从而优化 prompt following。

---

### 4. 面试官会问：扩散模型怎么做强化学习？action 和 policy 是什么？

**回答口径：**

可以把扩散模型看成一个逐步去噪的随机策略：

- 状态：当前 noisy latent、timestep、prompt condition。
- 动作：每一步预测的去噪方向或采样出的上一步 latent。
- policy：当前 diffusion model 定义的反向转移分布。
- reward：最终生成视频经过奖励模型得到的分数。

训练时不一定对每个 denoising step 都有 dense reward，通常是视频生成完成后给一个 outcome reward，再通过 policy gradient 类方法更新模型。为了稳定，通常还会加入 KL 约束，避免模型偏离原始基座太远。

---

### 5. 面试官会问：你的 CLIP 视频奖励怎么设计？

**回答口径：**

CLIP 原生处理图文匹配，不直接处理视频。所以我把视频奖励设计成“多帧采样 + 特征聚合”：

1. 从视频均匀采样若干帧。
2. 每帧通过 CLIP image encoder 得到图像特征。
3. 对帧特征做 mean pooling 或加权聚合，得到视频级 embedding。
4. prompt 通过 text encoder 得到文本 embedding。
5. 计算 cosine similarity 作为语义奖励。

优点是稳定、便宜、易批量化。缺点是 CLIP 对动作和时序不敏感，所以我又引入 Qwen2-VL 细粒度奖励来补充 motion 和 consistency。

---

### 6. 面试官会问：为什么不能只用 CLIP reward？

**回答口径：**

CLIP reward 有几个不足：

- 偏静态图文匹配，对动作理解弱。
- 多帧平均会丢失时间顺序。
- 容易被关键帧“骗过”，比如某一帧像 prompt，但整个视频动作不对。
- 对细粒度属性、数量、关系判断不稳定。

所以我把 CLIP 作为基础语义奖励，再用 Qwen2-VL 从 Alignment、Motion、Consistency、Overall 四个维度评估，增强细粒度和视频级判断能力。

---

### 7. 面试官会问：Qwen2-VL 奖励为什么要结构化 JSON？

**回答口径：**

如果直接让 VLM 输出自然语言评分，会有几个问题：

- 分数格式不稳定，解析困难。
- 评分尺度漂移，不同样本不可比。
- 容易输出解释但不给有效分数。
- 异常值难检测。

所以我设计了固定 Rubric 和 JSON schema，例如：

```json
{
  "alignment": 8,
  "motion": 7,
  "consistency": 8,
  "overall": 7,
  "reason": "..."
}
```

这样可以做自动解析、范围检查、异常重评和多维 reward fusion。

---

### 8. 面试官会问：四个维度为什么是 Alignment、Motion、Consistency、Overall？

**回答口径：**

这四个维度对应文本视频生成的主要失败模式：

- **Alignment**：主体、属性、场景是否符合 prompt。
- **Motion**：动作是否发生，是否符合描述。
- **Consistency**：主体身份、背景、纹理是否跨帧稳定。
- **Overall**：整体视觉质量和综合观感。

如果只看 overall，模型可能画面好但不听 prompt；如果只看 alignment，可能单帧对齐但视频不动。所以需要拆成多个维度，让奖励信号更可解释、更稳定。

---

### 9. 面试官会问：奖励融合怎么做？权重怎么定？

**回答口径：**

我的思路是把 CLIP reward 和 VLM reward 归一化到可比较尺度，再加权融合：

```text
R = w_clip * R_clip + w_vlm * R_vlm
```

VLM 内部也可以按维度加权：

```text
R_vlm = w_a A + w_m M + w_c C + w_o O
```

权重选择会根据训练目标调整。如果主要解决 prompt 不一致，就提高 Alignment 和 Motion；如果视频闪烁明显，就提高 Consistency；如果画质下降，就提高 Overall。

实际训练中还要监控各 reward 分布，避免某一路 reward 数值范围过大主导训练。

---

### 10. 面试官会问：怎么防止 reward hacking？

**回答口径：**

防止 reward hacking 可以从几个层面做：

- 奖励多样化：CLIP + VLM 多路奖励，避免单一模型被钻空子。
- 结构化 Rubric：减少 VLM 自由发挥。
- KL 约束：限制策略偏离原始 diffusion model。
- 人工抽检：定期看高分样本是否真的好。
- reward 分布监控：发现分数异常升高但视觉质量下降要及时停训。
- holdout prompt：不用训练 prompt 做评估，检测泛化。

可以补一句：强化学习后训练最怕“reward 上升但人看变差”，所以必须把自动指标和人工评估结合。

---

### 11. 面试官会问：为什么用 LoRA 微调？

**回答口径：**

视频 diffusion 基座模型很大，直接全参 RL 微调成本高且容易破坏原有生成能力。LoRA 只训练低秩适配矩阵：

- 显存和训练成本低。
- 更容易控制更新幅度。
- 便于多实验版本切换。
- 降低 catastrophic forgetting 风险。

缺点是表达能力有限，如果任务分布和基座差异很大，LoRA 可能不够。

---

### 12. 面试官会问：你这个项目如何评估是否有效？

**回答口径：**

我会从自动指标和人工评估两个层面看：

自动指标：

- CLIPScore：文本-视频语义相关性。
- VLM judge score：alignment/motion/consistency/overall。
- FVD/LPIPS 类指标：视频质量和分布。
- reward 分布变化：训练是否稳定。

人工评估：

- prompt 是否被满足。
- 主体和动作是否正确。
- 视频是否闪烁。
- 是否出现 reward hacking 或画质下降。

最终不能只看 reward，要看 holdout prompt 上的综合效果。

---

### 13. 项目一高压追问清单

**追问：VLM 打分很慢，训练怎么承受？**

答：可以异步打分、批量推理、缓存视频奖励、降低 VLM 调用频率，CLIP reward 作为快速基础奖励，VLM 用于关键 batch 或离线筛选。

**追问：同一个 prompt 生成多条视频，显存和时间成本太大怎么办？**

答：用较小分辨率/帧数做 RL 阶段，LoRA 微调，gradient accumulation，DeepSpeed，必要时减少 group size，在效果和成本之间折中。

**追问：如果 CLIP 和 VLM 分数冲突怎么办？**

答：先看冲突样本类型。如果 CLIP 高 VLM 低，可能是静态语义对但动作/一致性差；如果 CLIP 低 VLM 高，可能是 VLM 受语言先验影响。可以按维度分析并调整权重。

**追问：为什么不是直接 SFT 高质量视频？**

答：SFT 依赖高质量成对数据，优化的是模仿；GRPO 可以直接优化评价目标，尤其适合 prompt following、动作一致性这类难以用单一监督 loss 表达的目标。

**追问：RL 会不会损害画质？**

答：会有风险，所以需要 KL、LoRA、小学习率、多维 reward 和画质维度约束，不能只优化 alignment。

---

## 项目二：任务感知视觉 Token 动态剪枝

### 1. 60 秒项目介绍

这个项目是做长视频理解推理加速。长视频输入 Qwen2-VL 会产生大量视觉 token，attention 计算和 KV cache 都很重。V²Drop 根据视觉特征变化做动态 token 剪枝，但它不考虑用户问题，可能删掉和任务相关的 token。

我提出任务感知剪枝：在 Qwen2-VL attention 模块里保存每层 Query 和 Key，用文本 token 对视频 token 的 cross-attention 估计任务相关性，再和原有视觉变化分数融合，决定保留哪些视觉 token。同时我适配了多层渐进式剪枝、KV cache 同步裁剪、position 和 attention mask 更新。最终在 Video-MME 上保留约 20% 视觉 token 仍保持约 93% 性能，并降低推理延迟和显存。

---

### 2. 面试官会问：为什么长视频理解 token 会爆炸？

**回答口径：**

视频输入会先按帧采样，再把每帧切成 patch 或视觉 token。token 数大约和：

```text
frames × patches_per_frame
```

成正比。Transformer attention 复杂度接近 `O(N^2)`，KV cache 也随 token 数增长。长视频、多帧、高分辨率会迅速导致显存和延迟不可接受。

---

### 3. 面试官会问：V²Drop 的问题是什么？

**回答口径：**

V²Drop 主要根据视觉特征变化判断 token 重要性，这能保留视觉上变化大的区域，但不一定符合当前任务。

比如问题是“杯子的颜色是什么”，背景里运动的人可能视觉变化大，但杯子才是回答问题的关键。如果只看视觉变化，可能保留背景、删掉杯子 token。

所以我引入文本问题对视觉 token 的 attention，补充任务相关性。

---

### 4. 面试官会问：任务相关性分数怎么计算？

**回答口径：**

在 attention 里，文本 token 的 Query 会和视觉 token 的 Key 计算相似度：

```text
score = softmax(Q_text K_video^T / sqrt(d))
```

这个 attention score 可以理解为文本问题对每个视觉 token 的关注程度。我会对文本 token 维度、head 维度做聚合，得到每个视觉 token 的任务相关性分数。

然后和视觉变化分数融合：

```text
S_final = alpha * S_visual + beta * S_task
```

最终保留分数最高的一部分 token。

---

### 5. 面试官会问：为什么不能只用 cross-attention？

**回答口径：**

只用 cross-attention 也有问题：

- 早层 attention 可能不稳定。
- 问题文本短时，attention 可能过于稀疏。
- 某些背景 token 虽然当前 attention 低，但对时序理解有帮助。
- 纯任务相关性可能忽略运动变化。

所以我把任务相关性和视觉变化结合：视觉分数保证视频信息完整性，任务分数保证回答问题所需区域不被删。

---

### 6. 面试官会问：剪枝后为什么要同步 KV cache、position 和 mask？

**回答口径：**

Transformer 后续层依赖 token 序列。如果删除视觉 token，只删 hidden states 不够：

- KV cache 里还保存着被删 token，会造成索引不一致或无效计算。
- position id 不更新，位置编码会错位。
- attention mask 不更新，模型可能 attend 到不存在的 token。

所以要同步裁剪 hidden states、KV cache、position 信息和 attention mask，保证后续层看到的是一致的 token 序列。

---

### 7. 面试官会问：渐进式多层剪枝为什么比一次性剪枝好？

**回答口径：**

一次性在浅层删太多 token 风险很大，因为浅层语义还没充分形成，重要性估计不稳定。渐进式剪枝是在多层逐步减少 token：

- 浅层保留更多信息。
- 中高层语义更明确后再删。
- 减少误删关键 token 的风险。
- 整体性能更稳。

---

### 8. 面试官会问：保留 20% token 还有 93% 性能，怎么解释？

**回答口径：**

视频 token 存在大量冗余：

- 相邻帧背景重复。
- 静态区域信息重复。
- 对具体问题无关的区域很多。
- 视觉 token 对回答贡献不均匀。

任务感知剪枝能优先保留和问题相关、视觉变化显著的 token，所以即使只保留 20%，仍能保持大部分性能。

---

### 9. 项目二和视频生成 JD 怎么挂钩？

**回答口径：**

虽然项目二是多模态理解模型，但它和视频生成 JD 有三点关联：

1. **视频 token 高效建模**：Video DiT 也面临大量时空 token 的 attention 成本。
2. **任务/条件感知计算**：生成模型中 prompt 相关区域也可以获得更高计算预算。
3. **工程优化能力**：KV cache、attention mask、position 同步更新体现对 Transformer 推理机制的理解。

如果做视频 diffusion，我会考虑把类似任务感知 token pruning 或 sparse attention 用到 DiT 推理加速中。

---

### 10. 项目二高压追问清单

**追问：剪枝会不会破坏时间顺序？**

答：会有风险，所以剪枝时要保留 token 的原始时空位置，并更新 position/mask。也可以设置每帧最低保留比例，避免某些帧被完全删掉。

**追问：attention score 能代表重要性吗？**

答：不能完全代表，但它是任务相关性的有效 proxy。单独用有偏差，所以我和视觉变化分数融合，并通过下游 Video-MME 验证。

**追问：剪枝本身会不会带来额外开销？**

答：会，所以剪枝计算必须轻量。我的做法复用 attention 中已有的 Q/K，不额外引入大模型，只做聚合和 top-k，节省的后续 attention 成本大于剪枝开销。

**追问：为什么不是均匀采样更少帧？**

答：均匀少采样会直接丢失时间信息，而 token 剪枝是在保留帧覆盖的基础上删除冗余 token，对细粒度问答更友好。

---

## 3. 两个项目之间的统一叙事

面试时可以这样串：

> 我的两个项目都围绕视频大模型的“效果-效率”问题。第一个项目解决生成效果里的 prompt 对齐问题，通过 GRPO 和多维奖励让 T2V diffusion 更符合用户意图；第二个项目解决长视频理解的效率问题，通过任务感知 token 剪枝降低视觉 token 冗余。它们虽然一个偏生成、一个偏理解，但都涉及视频表征、文本-视频对齐、Transformer attention 和工程优化。

这样能让面试官觉得你的经历不是散的，而是围绕视频多模态模型能力建设。

---

## 4. 面试临场回答模板

### 如果问到你没真正做过的 low-level 视频修复

可以诚实但主动扩展：

> 我没有完整落地过视频去噪/超分项目，但我理解这类问题本质是条件生成或条件恢复。相比我做的 T2V 后训练，low-level 更强调输入保真和 temporal consistency。如果让我做，我会先构建退化模型和成对/非成对数据，再用 latent diffusion 或 conditional diffusion，把 degraded video 作为条件，同时加入重建损失、感知损失和时序一致性约束，评估上同时看 PSNR/SSIM、LPIPS 和闪烁指标。

---

### 如果问到 VAE/DiT 但你没有项目实操

可以这样答：

> 我项目里主要改的是后训练和奖励系统，没有从零训练 VAE/DiT。但我理解视频 diffusion 里 VAE 决定 latent 表示和重建上限，DiT 决定时空 token 的建模能力。VAE 侧重点是压缩率、重建质量和时间一致性；DiT 侧重点是 token 组织、时空位置编码、attention 复杂度和条件注入。如果入职做这块，我会优先从复现现有 Video VAE/DiT pipeline 和 ablation 开始。

---

### 如果问：你的优势是什么？

回答重点：

> 我的优势是对视频生成模型的训练目标和评估闭环比较敏感。我不是只跑模型，而是从 prompt 数据、奖励建模、RL 微调、分布式训练、自动评估到失败降级做了完整闭环。同时我也做过长视频 token 剪枝，对视频 token 冗余、attention 成本和推理优化有实践经验。对于这个岗位，我需要继续补强的是 low-level restoration 和 video codec，但 diffusion、视频多模态和工程实现这几块我能比较快上手。

---

## 5. 最后 30 分钟速背清单

- **Diffusion 本质**：逐步加噪 + 学习反向去噪，训练常用噪声预测或 v-prediction。
- **视频难点**：时间一致性、运动合理性、长程依赖、计算量、数据质量。
- **VAE 作用**：压缩到 latent 降成本，但重建误差决定画质上限。
- **DiT 优势**：scaling 好，适合统一建模时空 token，但 attention 成本高。
- **Low-level diffusion**：条件生成，关键是 fidelity-realism trade-off。
- **视频压缩结合 diffusion**：低码率条件 + 生成式 decoder prior，但要防幻觉。
- **项目一主线**：MSE 不等于 prompt 对齐，所以用 GRPO + CLIP/VLM 多维奖励。
- **项目二主线**：视觉 token 冗余大，所以用文本 attention 引入任务感知剪枝。
- **两个项目统一点**：一个提升生成对齐，一个提升视频推理效率，都是视频多模态大模型能力。

