Transformer 笔记

# 为什么提出 Transformer

**RNN和LSTM存在的问题：**无法并行计算（时间步依赖）长距离依赖难学习梯度消失/爆炸训练速度慢

**Transformer：**完全基于 Attention，**并行计算**、长距离建模能力强、GPU利用率高、易扩展（大模型基础）

---

# 整体结构

<img src="https://i-blog.csdnimg.cn/img_convert/00e3bfd5a3c0070849b4aa5fa2635b12.png" alt="img" style="zoom: 50%;" />

Transformer 整体采用 **Encoder-Decoder 架构**，由编码器和解码器两部分组成，每部分都由多个相同的层堆叠而成。

# 数据流

> 简短概括—数据流：**输入 → Embedding → Position Encoding → Encoder → Decoder → Linear → Softmax → 输出。**

## Embedding

输入文本经过 **Embedding**，每个 Token 映射为固定维度的向量。例如：我  ——>   [0.7,-0.4,0.2,0.3,0.5,……]

## Position Encoding

**为什么需要Position Encoding？**

Transformer 中的 Self-Attention 本身是**置换不变**的。对于Self-Attention，“我爱AI”和“AI 爱我”是一样的。如果没有位置编码，模型只知道有哪些 Token，不知道它们的顺序，因此无法理解语义。所以必须加入位置信息。之后进入Encoder

## Encoder

每个 Encoder 层都包含两个核心模块：Multi-Head Self-Attention（多头自注意力MHA）和Feed Forward Network（前馈神经网络FFN）。其中，每个子模块后都会进行 Residual（残差连接） 和 Layer Normalization（层归一化），最终输出的是整个输入序列的上下文表示，然后进入 Decoder。

> 后文都使用相关缩写：MHA FFN 

## Decoder 

> Encoder 的输出会传给 Decoder 每一层的 Cross Attention 模块，作为 Key 和 Value，用来给 Decoder 提供输入序列的上下文信息。

Decoder每一层包含三个模块：Masked MHA、Cross Attention（编码器-解码器注意力）、FFN。其中：

- Masked Self-Attention 会对未来位置进行 Mask，保证生成当前 Token 时不能看到后面的内容，实现自回归生成。
- Cross Attention 中，Query 来自 Decoder，而 Key 和 Value 来自 Encoder 的输出，因此 Decoder 可以利用 Encoder 提供的上下文信息完成翻译或生成任务。

最后，Decoder 输出经过一个 Linear 层 映射到词表大小，再经过 Softmax 得到每个词的概率分布，从而预测下一个 Token。

# ROPE旋转位置编码

## 面试简洁版本

> 传统 Position Encoding 是把位置向量直接加到 Embedding 上，位置信息只是输入的一部分；而 RoPE 不修改 Embedding，而是将 Q 和 K 的每两个**相邻维度**看成二维平面中的一个向量，然后根据 token 的位置进行旋转。旋转后的 Q、K 进行点积时，结果只与两个 token 的相对位置差有关，因此将位置信息引入 Attention。

## 为什么提出 RoPE？

早期 Transformer 使用的是 Sin/Cos 位置编码，把位置向量直接加到 Embedding 上：这种方式虽然简单，但存在两个问题：位置信息是额外加进去的，与 Attention 结合不够自然。对长文本的泛化能力有限。

RoPE 的思路：不再把位置加到 Embedding 上，而是在计算 Attention 前，对 Query 和 Key 做位置相关的旋转变换。这样，位置信息会直接参与 Attention 的计算。

## Sin/Cos 绝对位置编码

$$
Embedding 得到三个向量：e_1、e_2、e_3，位置编码为：p_1、p_2、p_3,绝对位置编码:x_i=e_i+p_i\\

例如：e_1= \begin{bmatrix} 1\\ 2 \end{bmatrix}, \qquad p_1= \begin{bmatrix} 0.1\\ 0.2 \end{bmatrix},那么输入Encoder的就是：x_1= \begin{bmatrix} 1.1\\ 2.2 \end{bmatrix}
$$

## RoPE 的做法

由Embedding向量X得到Q、 K，对Q、K 做旋转：Q'=RoPE(Q) 、K'=RoPE(K)，旋转后的 Q、K 进行点积时，结果只与两个 token 的相对位置差有关，因此将位置信息引入 Attention。

> 旋转公式为：
> $$
> \begin{bmatrix}
> x'_{2i}\\
> x'_{2i+1}
> \end{bmatrix}
> =
> \begin{bmatrix}
> cos(m\theta_i)&-sin(m\theta_i)\\
> sin(m\theta_i)&cos(m\theta_i)
> \end{bmatrix}
> \begin{bmatrix}
> x_{2i}\\
> x_{2i+1}
> \end{bmatrix}
> $$

> $$
> \theta_i=（1/10000）^{2i/d}。
> $$

**位置无关**
$$
Q′=R_m​Q，K′=R_n​K\\Q′^TK′=(R_m	​Q)^T(R_n	​K)=Q^TR_{n−m}​K\\
R_m^T​R_n=R_{n−m}
$$
两个 token 的相对距离n-m，因此结果只与两个 token 的相对位置差有关,同时也将位置信息引入 Attention

# 自注意力Attention

Self-Attention 的作用是让每个 Token 都能够关注输入序列中的所有 Token，从而学习全局上下文信息；

Transformer 的输入首先经过 Embedding 得到每个 token 的表示，记作 **X~i~**。然后通过三个不同的**可学习权重矩阵**进行线性变换。

> Q~i~=X~i~W~Q~、K=X~i~W~k~、V=X~i~W~v~。

Q 可以理解成：当前这个词想从上下文中寻找什么信息。K：我有什么标签？我是什么？ V：具体的语义。每个token都有对应的QKV

## Attention计算

$$
Attention(Q,K,V)=Softmax\left(\frac{QK^T}{\sqrt{d_k}}\right)V\\
$$

1.当前词Q ~m~和所有 K做点积计算相似度,得到score ~i~

2.Score=[score ~0~, score ~1~,……]，除√d~k~，Attention=Softmax(Score)，得到权重向量【0.2，0.3，0.5】

3.Output ~m~ =0.2V1+0.3V2+0.5V3，得到Output矩阵其中一个向量

为了增强模型表达能力，Transformer 使用 **Multi-Head Attention**。也就是把 Attention 分成多个 Head，每个 Head 学习不同类型的关系，比如语义关系、位置关系、句法关系等，最后再拼接起来。

---

## 为什么除 $\sqrt{d_k}$ 

除以 $\sqrt{d_k}$ 是为了避免点积过大导致 Softmax 饱和，使训练更加稳定。

没有缩放：Score=[10,2,1]，Softmax=[0.999,0.0009,0.0003]，几乎全部注意力给第一个 token。这种情况叫**Softmax 饱和**

**问题：**
$$
softmax(x_i​)=\frac{e^{x_i}}{∑e^{x_j}}\\
梯度=\frac{\partial softmax}{\partial x}会接近 0。
$$

# 残差连接Residual

Transformer的残差连接，存在于两个地方：

- Attention：X′=X+Attention(X) 
- FFN ：Output=X'+FFN(X')

残差不学习结果本身，只学习输入和输出之间的差异。

> 为什么需要残差？

**作用：解决深层网络梯度消失、保留原信息:**

Transformer 通常有几十甚至上百层。没有残差，梯度需要经过很多层,容易梯度越来越小,导致底层参数难更新
$$
Xout	​=Fn(Fn−1	​(...F1	​(X)))
$$

> 注：层数越深梯度越小 = **梯度消失**
>
> 本质原因：反向传播是**链式求导连乘**，每一层都会乘上一层激活函数 / 权重的导数；多层连续相乘，若乘数绝对值小于 1，多次连乘后数值指数级缩小，靠近输入层的梯度几乎变成 0，参数无法更新。

加上残差后，反向传播梯度可以直接传递。
$$
\frac{\partial y}{\partial x}
=
1+\frac{\partial F(x)}{\partial x}
$$

# 层归一化LayerNorm

> LayerNorm 的作用：对每个样本内部的特征维度进行标准化，使数据分布更加稳定，从而加快训练并提高模型稳定性。

按照LN的不同分为如何两种，接下来以Post-LN为准：

- Post-LN：Attention **之后** LN（原始Transformer）
- Pre-LN：先 LN，再进 Attention（BERT、LLaMA、GPT 系列）

## LN实现

**面试简洁回答**

> LayerNorm 的计算分为四步：首先对每个 Token 的隐藏向量计算均值和方差；然后进行标准化，使均值为 0、方差为 1；最后通过可学习参数 γ 和 β 进行缩放和平移。在 Transformer 原论文采用的 **Post-LN** 结构中，LayerNorm 位于残差连接之后，即 **Add → LayerNorm**.

$$
\begin{aligned}
对于输入向量：x=[x_1,x_2,\cdots,x_d]计算得到均值\mu和标准差\sigma\\
标准化\hat{x}_i=\frac{x_i-\mu}{\sqrt{\sigma^2+\varepsilon}}\\
\text{LN}(x)=\gamma\hat{x}+\beta
\end{aligned}
$$

其中：$\gamma$、$\beta$、$\varepsilon$：可学习缩放参数、可学习偏移参数、防止除零的常数。

**LN的位置**：先残差连接，再进行层归一化。Attention：Y=LN【X+MHA(X)】	FFN：Z=LN【Y+FFN(Y)】

## **标准化的作用**

**面试简洁回答**

> LayerNorm 将每个 Token 的隐藏向量标准化，使其均值为 0、方差为 1。均值为 0 可以让数据围绕 0 分布，避免整体偏移，帮助梯度更稳定地传播；方差为 1 可以统一各层输出的数值尺度，避免某些层输出过大导致梯度爆炸，或过小导致梯度消失。因此，LayerNorm 能够稳定数据分布，加快模型收敛，提高深层 Transformer 的训练稳定性。

**标准化后均值为0**。如果输入一直都是很大的正数，下一层线性变化后Wx+b输出容易一直偏正，对于Sigmoid 激活函数：
$$
σ(z)=\frac1{1+e^{−z}}，e^{−z}→0, σ(z)≈1，σ′(z)≈1×0=0
$$
输入再怎么变，输出几乎不变，梯度趋近 0。

**标准化后方差为1**。梯度大小通常与输入值成正比，如果某一层输出数值波动很大，即方差很大，那么输入可能出现很大的值，导致梯度变大；在深层网络中，这种大梯度经过多层传播可能不断累积，从而增加梯度爆炸的风险。
$$
\frac{\partial L}{\partial W}
\propto x
$$

## 为什么不用BatchNorm？

BatchNorm 是在 batch 内统计均值和方差，例如一个 batch 有多个样本，BN 会把这些样本的同一特征归一化，使其均值为0、方差为1。它依赖 batch 统计信息，因此适合图像 CNN；而 Transformer 中序列长度变化、推理 batch 较小，所以使用不依赖 batch 的 LayerNorm。
$$
BN(x)=\frac{x-\mu_{batch}}{\sqrt{\sigma_{batch}^{2}+\epsilon}}
$$

# 前馈网络FFN

**面试回答：**

> FFN是 Transformer 中位于 Self-Attention 后的前馈神经网络，它对每个 Token 独立进行非线性特征变换，不涉及 Token 之间的信息交互。原论文中的 FFN 由两层全连接网络和 ReLU 激活组成，公式为：
> $$
> FFN(x)=\max(0,xW_1+b_1)W_2+b_2
> $$
> 第一层通常将隐藏维度从 $d_{model}$ 扩展到约 $4d_{model}$，经过激活函数后再映射回原始维度。这样既引入了非线性，提高模型表达能力，又保持输出维度不变，便于堆叠多个 Transformer Block。现代大模型通常将 ReLU 替换为 GELU 或 SwiGLU，以获得更好的性能。

## ReLU激活

> 速记：1.不会梯度消失  2.计算简单 3.稀疏激活  4.神经元死亡

$$
ReLU(z)=max(0,z)
$$

优势：（1）无正向饱和区，不会梯度极小。Sigmoid 输入很大正数时趋近 1，导数接近 0，会梯度消失； ReLU 只要 z>0，导数恒等于 1。（2）计算简单。速度快只有取最大值运算，没有指数、除法，训练速度远快于 Sigmoid。（3）稀疏激活。负数直接置 0，很多神经元输出为 0，特征稀疏，一定程度减少冗余信息。

缺陷：线性输出 z=Wx+b 长期全部小于 0时， ReLU(z)=0，导数永久 = 0。 反向传播时梯度永远是 0，权重永远不更新，彻底失效，神经元 “死掉” 不再参与学习。

## 为什么要两层线性

> 速记：第一层负责升维，激活函数引入非线性，第二层降回原来维度

FFN 用两层线性层，是为了实现一个带非线性的特征变换。第一层升维扩大特征空间，让模型有更多容量学习组合特征。中间的激活函数ReLU引入非线性；第二层降维回到原来的 hidden size，方便和残差连接相加。

# Masked Self Attention

Masked Self Attention是 Decoder 的第一步自注意力模块，它的输入不是 Encoder 输出，而是已经生成的目标序列 embedding。它通过 Q、K、V 做 self-attention，并加入 causal mask，使当前位置只能看到过去 token，防止模型利用未来信息。

## Mask如何实现

***Casual Mask是什么？技术上如何实现？***

> **Causal Mask（因果掩码）** 是一种用于防止模型“偷看未来答案”的机制，它确保模型在预测下一个词时，只能关注当前及自它之前的文本。

> 在技术实现上，它通常是一个与输入序列等大的**下三角矩阵**：矩阵的左下角（包括对角线）元素为 0，代表允许关注的历史信息；右上角元素则被设为负无穷大（$-\infty$）。
>
> 1.在自注意力机制（Self-Attention）计算时，该掩码矩阵会与注意力得分矩阵相加，右上角代表未来的那个得分，直接被砸成了 **$-\infty$（负无穷）**
>
> ```
> 	我    读
> 我   [ 4,   2 ]  （“我”对“我”的得分是4，“我”对未来词“读”的得分是2） + [0 -∞]
> 读   [ 1,   5 ]  （“读”对过去词“我”的得分是1，“读”对“读”的得分是5）  [0  0]
> ```

> 2.右上角区域在经过 Softmax 激活函数后权重彻底变为 0，从而在数学上完美遮蔽掉“未来的信息”。Softmax 的公式会给这些得分做指数运算（即 $e^{score}$），然后归一化成概率（权重）。e^4≈54.6	$e^{-\infty}$=0
> $$
> \text{最终权重矩阵} = \begin{bmatrix} 1.0 & 0.0 \\ 0.02 & 0.98 \end{bmatrix}
> $$

# Encoder输出

Encoder 输出也叫 memory，是输入文本经过多层编码器融合上下文后得到的序列向量矩阵，包含词语语义、位置和全文关联信息，专门供给解码器交叉注意力读取原文信息。例如：I   love  you    → [h1 ,h2, h3]，也就是变成三个上下文向量。

# 交叉注意力Cross Attention

## 面试简洁回答

> Cross Attention 是 Decoder 中连接 Encoder 和 Decoder 的注意力机制，它的作用是让 Decoder 在生成当前 token 时，能够利用 Encoder 提取的源序列信息。它和 Self-Attention 最大的区别在于 Q、K、V 的来源不同：Query 来自 Decoder 当前的隐藏状态，而 Key 和 Value 来自 Encoder 的输出。Self-Attention 是让 Decoder 看自己已经生成的内容，而 Cross Attention 是让 Decoder 根据当前生成状态，从 Encoder 的输出中检索最相关的信息。

假设已经生成了： “I love ”，现在需要预测下一个词 “you”。首先，Decoder 会经过 Masked Self-Attention，结合已经生成的 `"我 爱"` 得到当前隐藏状态，然后进入 Cross Attention。

> 隐藏状态 ≈ 当前生成进度 + 已生成内容的语义信息

- **Query（Q）来自 Decoder 当前隐藏状态**，表示"我现在需要什么信息"；
- **Key（K）和 Value（V）来自 Encoder 输出**，表示"输入句子有哪些信息可以提供"。

例如：翻译 "I love you"。当 Decoder 已经生成"我 爱"，准备生成下一个词时，Cross Attention 会用 Decoder 当前隐藏状态作为 Query，去和 Encoder 输出的 "I"、"love"、"you" 对应的 Key 做相似度计算。如果和 "you" 的相似度最高，就会重点关注 "you" 对应的 Value，最终生成"你"。

# Linear + Softmax

> Linear 的作用是将 Decoder 输出的隐藏状态映射到整个词表，得到每个词的预测分数；Softmax 再将这些分数转换为概率分布，最终选择概率最高的 token 作为当前时刻的输出。

# 训练和推理

原始 Transformer 的 Encoder 输入长度和输出隐藏状态长度相同，因为 Encoder 是逐 token 编码；但是 Decoder 是自回归生成，最终输出长度不受输入长度限制，可以不同。

- 训练时会把目标序列右移后作为 Decoder 输入，所以输入和预测位置数量相同
- 推理时 Decoder 一个 token 一个 token 地生成，直到 EOS结束编码。

Decoder 的结构在训练和推理阶段是不变的，区别是输入不同。训练阶段，把完整目标答案序列右移后输入 Decoder，并通过 Mask 保证每个位置只能看到历史信息，因此可以并行计算多个 token。推理阶段没有真实答案，只能将已经生成的 token 作为下一步输入，因此采用自回归方式逐个生成。

# Transformer特点

- 时间复杂度：O(n²)。原因：任意两个token计算一次。矩阵：n×n，因此长文本成本高。
- 优点:并行训练、长距离依赖强、Attention可解释
- 缺点:O(n²)复杂度，长文本显存大、推理KV Cache占内存、对位置编码敏感

# GPT、BERT、Transformer关系

> **Transformer 是一种深度学习模型架构，最早用于机器翻译，它提出了 Self-Attention 机制，可以有效捕捉序列中的上下文关系。GPT 和 BERT 都是基于 Transformer 的预训练语言模型，但采用了不同的结构。**

> **BERT 使用的是 Transformer 的 Encoder 部分，通过双向 Self-Attention 同时利用上下文信息进行理解，主要用于文本理解任务，比如分类、问答、命名实体识别等。**

> **GPT 使用的是 Transformer 的 Decoder 部分，通过单向 Masked Self-Attention，只利用前面的 token 预测下一个 token，因此是自回归生成模型，主要用于文本生成。**