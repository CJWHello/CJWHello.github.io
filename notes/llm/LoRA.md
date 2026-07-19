# 一、学习目标

## 理论理解

| 主题                                      | 核心内容                                                     | 掌握标准                                    |
| ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| **LoRA 原理**                             | 知道 LoRA（Low-Rank Adaptation）的基本思想：用小矩阵 $A,B$ 近似大矩阵更新，冻结主权重。 | 能复述 LoRA 的数学公式和节省参数的原因。    |
| **Adapter / Prefix / Prompt Tuning 区别** | 各种参数高效微调（PEFT）方法的对比。                         | 能解释为什么 LoRA 在 LLM 任务中效果更稳定。 |
| **QLoRA 原理**                            | 量化 + LoRA 结合：4bit quantization + LoRA adapter。         | 能解释量化权重如何节省显存，训练仍然可微。  |
| **微调的目标**                            | SFT（Supervised Fine-Tuning）的意义：让模型学会特定风格或任务。 | 能举例区分 pretrain / finetune / RLHF。     |

------

## 工程实践

> 理解 LoRA 原理

> 能在单张显卡上微调 ChatGLM / LLaMA / Qwen 等模型

> 会使用 Hugging Face + PEFT 进行训练

> 能回答面试中有关 LoRA 的原理与实现问题

| 模块                     | 掌握目标                                                     | 检查标准                                               |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------ |
| **数据准备**             | 学会加载 json / csv / huggingface datasets 格式，理解 `input_ids` 与 `labels`。 | 能独立构建一个 1000 条左右的对话数据集并喂给 Trainer。 |
| **模型加载**             | 学会使用 `AutoModelForCausalLM.from_pretrained()`，理解 device_map、quantization_config。 | 能在 4GB 显存环境下加载量化模型并推理一句话。          |
| **LoRA 配置**            | 理解 `LoraConfig` 中的 `r`, `lora_alpha`, `target_modules`, `lora_dropout`。 | 能解释参数含义，调整时知道会对收敛速度和显存的影响。   |
| **PEFT 封装**            | 掌握 `get_peft_model()` 与 `prepare_model_for_kbit_training()`。 | 能加载基础模型 → 封装 LoRA → 开始训练。                |
| **Trainer / Accelerate** | 理解 `TrainingArguments`，知道 gradient_accumulation, lr_scheduler, logging_steps。 | 能训练一个 3~5 epoch 的 demo 任务并可视化 loss。       |
| **推理验证**             | 使用 `PeftModel.from_pretrained()` + tokenizer 做推理。      | 模型能生成合理输出，并可与 base 模型对比。             |

------

## 性能调优

| 方面                         | 掌握内容                                                     | 检查标准                             |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| **显存优化**                 | 学会使用 `bitsandbytes` 4bit、gradient checkpointing、fp16/bf16。 | 能在 T4 / 4GB GPU 下完成一次微调。   |
| **学习率与 batch size 调参** | 理解 warmup、cosine decay、batch accumulation。              | 能根据 loss 曲线调整参数以稳定训练。 |
| **评估指标**                 | 理解 perplexity、BLEU、ROUGE、accuracy、loss。               | 能报告至少一个指标并解释变化趋势。   |
| **保存与部署**               | 区分 adapter 保存 (`save_pretrained`) 与合并 (`merge_and_unload`)。 | 能导出合并后的模型用于推理。         |

------

## 理论 + 实践融合

1. 为什么 LoRA 能降低显存占用？
2. QLoRA 如何在量化后仍保持梯度更新能力？
3. LoRA 与全参数微调在效果和代价上的差异？
4. 微调后模型的推理性能变化？
5. 如何将多个 LoRA adapter 合并 / 切换使用？

## 自我评估

| 评估项                               | 状态 | 说明 |
| ------------------------------------ | ---- | ---- |
| 能完整解释 LoRA 原理及节省参数的原因 | ☐    |      |
| 能手写一份 LoraConfig 并运行训练     | ☐    |      |
| 能使用自己的数据集完成一次 SFT       | ☐    |      |
| 能计算模型的 PPL 或 BLEU 指标        | ☐    |      |
| 能在 4GB GPU 环境下加载并推理        | ☐    |      |
| 能比较 LoRA / QLoRA / 全量微调的区别 | ☐    |      |
| 能讲出 LoRA + PEFT 的适用场景        | ☐    |      |

# 二、LoRA 基本原理

##  为什么需要 LoRA？

传统全参数微调（Fine-tuning）要更新模型中所有参数（数十亿量级），显存和计算量非常大。

> 全参微调需要 大量资源/可能破坏性能/多场景部署需要大量存储/计算延迟

 LoRA 的想法是：

> “模型已经学到通用知识，只需要在少数方向上学习任务特定变化。”

于是只训练一小部分 **低秩矩阵（Low-Rank Matrices）**，而保持原模型参数冻结。

------

##  LoRA 原理解析

LoRA-低秩适应核心

> **冻结原模型**：不改变大模型的千亿 / 百亿级基础权重
> **插入小参数模块**：在模型关键层插入两个小矩阵（A 和 B），训练时仅更新这两个矩阵的参数
> **低秩降维**：矩阵 A 将高维输入压缩到低维（降维），矩阵 B 再将低维数据恢复到原维度（升维），通过 “降维→升维” 的过程，用极少参数实现精准适配。

LoRA参数数量

> LoRA只需要训练 参数数量为 d*r+r*d=2*r*d，原始权重矩阵参数数量-d*d

LoRA 不直接更新 ( W )，而是加入一个可学习的低秩分解

$$
W_{finetuned}=W_{pretrined}+W_{BA}\\
W_{BA} = B*A \\
A为随机初始化矩阵，且服从正态分布,r*d阶矩阵\\
B初始化为零矩阵，d*r阶矩阵\\
初始化作用：训练初期不破坏预训练模型的初始性能
$$
为什么A矩阵初始化要服从正态分布?B要为零矩阵

> #1.确保初始梯度的有效传播，避免梯度消失或者爆炸
> #2.提供足够的随机性
> #3.平衡训练初期的影响

> 全部初始化为零矩阵容易梯度消失
> 全部正态分布，偏移值过大，难以收敛

**优点：**

- 可训练参数量减少上百倍
- 显存占用极低
- 训练完后可“叠加”在原模型上

------

##  LoRA 实际插入位置

在 Transformer 的 Self-Attention 层中，通常为：

```
Q_proj、K_proj、V_proj、O_proj 四个线性层
```

> ***LoRA 一般插入到 `Q_proj` 和 `V_proj`，因为它们最敏感于任务变化。***

# 三、 实战示例： LoRA 微调 Llama2-7B

## QLoRA代码

```py
# 登录Hugging Face
from huggingface_hub import login
login(token="")	#Hugging Face中申请模型token

# 2. 导入库
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    pipeline
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import load_dataset
from trl import SFTTrainer
import bitsandbytes as bnb

# 模型和数据集配置
MODEL_NAME = "meta-llama/Llama-2-7b-hf"

# 加载tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token  # 设置pad token

# 8位量化配置
bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,          # 8位量化
    bnb_8bit_quant_type="nf8",  # 优化的8位量化类型
    bnb_8bit_compute_dtype=torch.float16,  # 计算精度
    bnb_8bit_use_double_quant=True,  # 双量化，进一步压缩
)

# 加载模型（自动分配到GPU）
base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,	#量化配置
    device_map="auto",  # 自动分配设备（优先GPU）
    trust_remote_code=False,
    torch_dtype=torch.float16  # 加速计算
)
"""
auto表示自动分配：
	优先将模型层加载到 GPU（若有可用 GPU 且显存足够）；
	若 GPU 显存不足，自动将部分层分配到 CPU 或磁盘（通过内存 / 磁盘缓存临时加载）；
	避免手动指定设备的繁琐，适合显存有限的场景（如单 GPU 运行大模型）。
其他可选值：
	"cpu"：强制所有层加载到 CPU（速度慢，适合无 GPU 环境）；
	0：强制所有层加载到第 0 号 GPU（显存足够时推荐，速度最快）；
	字典形式（如{"layer1": 0, "layer2": "cpu"}）：手动指定每一层的设备（精细控制）
"""

# 3. 模型预处理（为量化训练做准备）
model = prepare_model_for_kbit_training(base_model)#确保量化模型能够正常进行微调

# 4. 配置LoRA参数（仅训练少量适配器参数）
lora_config = LoraConfig(
    r=8,  # LoRA秩（越小显存占用越低）
    lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # 多训练输出层，效果更优
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# 转换模型为PEFT模型
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # 查看可训练参数比例（通常<1%）

# 加载数据集（使用小数据集，避免显存溢出）
# 示例：使用imdb情感分类数据集（文本生成任务需调整格式）
dataset = load_dataset("imdb")
dataset = dataset["train"].shuffle(seed=42).select(range(2500))  # 只使用10%的训练数据（约2500样本），大幅减少总步数

# 5. 数据预处理（将序列长度限制整合到分词步骤）
def preprocess_function(examples):
    texts = [f"评论：{text}\n情感：{'正面' if label == 1 else '负面'}"
             for text, label in zip(examples["text"], examples["label"])]
    # 直接在分词时指定 max_length，替代原 max_seq_length 参数
    return tokenizer(
        texts,
        truncation=True,
        max_length=256,  # # 缩短序列长度
        padding="max_length",
        return_tensors="pt"
    )

tokenized_dataset = dataset.map(
    preprocess_function,
    batched=True,
    batch_size=32,  # 增大批量预处理大小
    remove_columns=["text", "label"],
    load_from_cache_file=True  # 缓存预处理结果，避免重复计算
)

# 5. 训练参数（核心优化点）
training_args = TrainingArguments(
    output_dir="./llama-colab-15gb",
    per_device_train_batch_size=8,  # 提升单卡batch size
    gradient_accumulation_steps=1,  # 总batch=8（无需累积，减少计算延迟）
    num_train_epochs=1,  # 样本量减少后，1个epoch足够
    logging_steps=200,  # 减少日志频率，降低GPU中断
    learning_rate=3e-4,  # 适当提高学习率，加速收敛
    save_strategy="epoch",
    optim="adamw_torch_fused",  # 融合优化器，比paged_adamw_8bit快30%+
    fp16=True,  # 15GB支持纯FP16混合精度，比4bit量化快
    report_to="none",
    max_grad_norm=0.3,  # 稳定训练，允许更大学习率
    warmup_ratio=0.03,  # 短预热，加速进入有效训练
    lr_scheduler_type="cosine"  # 余弦调度，收敛更快
)

# 7. 初始化 SFTTrainer（适配最新版 TRL，移除 tokenizer 和 peft_config 参数）
trainer = SFTTrainer(
    model=model,  # 已通过 get_peft_model 转换为 PEFT 模型，无需再传 peft_config
    train_dataset=tokenized_dataset,  # 预处理后的数据集（需包含input_ids 等）
    args=training_args,  # 训练参数中已包含必要配置
)

# 8. 开始训练
trainer.train()

# 9. 保存LoRA适配器（仅几MB）
model.save_pretrained("llama-lora-adapter")


# 加载LoRA适配器
from peft import PeftModel
inference_model = PeftModel.from_pretrained(base_model, "llama-lora-adapter")
inference_model.eval()  # 切换到评估模式

# 创建推理管道
generator = pipeline(
    "text-generation",
    model=inference_model,
    tokenizer=tokenizer,
    device_map="auto"
)

# 测试用例
test_reviews = [
    "This movie was absolutely amazing! The acting was top-notch and the plot kept me engaged throughout.",
    "I've never seen such a terrible film. The story was boring and the characters were uninteresting."
]

# 推理函数
def predict_sentiment(review):
    prompt = f"评论：{review}\n情感："
    outputs = generator(
        prompt,
        max_length=512,
        temperature=0.7,  # 控制随机性，0.7为适中值
        top_p=0.9,
        repetition_penalty=1.2,  # 减少重复生成
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id
    )
    # 提取生成的情感结果
    result = outputs[0]['generated_text'][len(prompt):].strip()
    return result

# 执行推理并打印结果
for review in test_reviews:
    sentiment = predict_sentiment(review)
    print(f"评论：{review[:50]}...")  # 只显示前50个字符
    print(f"预测情感：{sentiment}")
    print("-" * 50)
```

## 代码解释

> model = prepare_model_for_kbit_training(base_model)

> 目的是确保量化模型能够正常进行微调（尤其是LoRA等参数高效微调方法）。  

> 量化模型会对参数进行特殊编码（如整数化存储），直接训练可能出现兼容性问题（如梯度计算错误、精度丢失）。  
>
> 直接用 `base_model`（量化后的原始模型）进行训练，可能会出现： - 梯度无法计算（量化参数是整数类型，不支持反向传播）； - 显存溢出（未启用梯度检查点，激活值占用过多显存）； - 训练过程中精度骤降（量化参数与训练更新的数值范围不匹配）。

 **具体预处理操作** 

> **启用梯度检查点（Gradient Checkpointing）**
> 用计算时间换显存：不保存所有中间激活值，而是在反向传播时重新计算，进一步减少显存占用（尤其适合大模型）。

> **调整参数的数据类型**     
> 将量化模型中需要计算梯度的部分参数（如LoRA适配器要附着的层）转换为适合训练的精度（通常是 `float16` 或 `bfloat16`），避免整数类型无法计算梯度的问题。 

> **禁用模型的某些优化**    
> 关闭量化模型中默认的“预计算”或“静态量化”优化（这些优化适合推理，但会阻碍训练时的动态更新）。

> **设置模型为训练模式**  
> 自动调用 `model.train()`，启用dropout等训练专用层（若模型有）。

> **处理特殊模块**     
> 对量化模型中的 `lm_head`（语言模型头）等关键模块进行适配，确保输出层的计算与量化参数兼容。 

### LoraConfig

```python
lora_config = LoraConfig(
    r=8,  # LoRA秩（越小显存占用越低）
    lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # 多训练输出层，效果更优
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
```

**`lora_alpha=16`**

> 表示 LoRA 的**缩放因子（Scaling Factor）**，用于调整低秩矩阵输出的权重。

> 原理：低秩矩阵的输出会先乘以 `lora_alpha/r` 再与原始模型输出相加（残差连接），相当于控制 LoRA 模块对最终结果的影响强度。

> 作用：`lora_alpha` 与 `r` 的比值（`alpha/r`）决定了 LoRA 贡献的权重，通常设置为 `r` 的 2 倍左右（如 `r=8` 时 `alpha=16`），保证 LoRA 模块的影响力适中。

**`lora_dropout=0.05`**

> 表示在 LoRA 模块中添加的 ** dropout 概率 **（此处为 5%）。

> 作用：在训练时随机丢弃部分低秩矩阵的输出，防止模型过度拟合训练数据，增强泛化能力。通常设置较小的值（0.05-0.1），避免过度抑制 LoRA 模块的学习。

### TrainingConfig

```py
# 5. 训练参数（核心优化点）
training_args = TrainingArguments(
    output_dir="./llama-colab-15gb",
    per_device_train_batch_size=8,  # 提升单卡batch size
    gradient_accumulation_steps=1,  # 总batch=8（无需累积，减少计算延迟）
    num_train_epochs=1,  # 样本量减少后，1个epoch足够
    logging_steps=200,  # 减少日志频率，降低GPU中断
    learning_rate=3e-4,  # 适当提高学习率，加速收敛
    save_strategy="epoch",
    optim="adamw_torch_fused",  # 融合优化器，比paged_adamw_8bit快30%+
    fp16=True,  # 15GB支持纯FP16混合精度，比4bit量化快
    report_to="none",
    max_grad_norm=0.3,  # 稳定训练，允许更大学习率
    warmup_ratio=0.03,  # 短预热，加速进入有效训练
    lr_scheduler_type="cosine"  # 余弦调度，收敛更快
)
```

# 四、进阶：QLoRA _量化微调

QLoRA = LoRA + 量化技术（BitsAndBytes）

核心思想：

> 先将模型量化为8bit（节省显存）

> 量化权重上叠加LoRA参数进行训练

量化原理:

> 降低模型参数的数据精度（如从 32 位浮点降到 8 位或 4 位整数）来减少显存占用、加速计算的关键技术

示例加载：

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

# 8位量化配置（关键：节省显存，Colab T4可运行）
bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,          #是否量化
    bnb_8bit_quant_type="nf8",  # 优化的8位量化类型 int8/nf8 int 4/nf4
    bnb_8bit_compute_dtype=torch.float16,  # 指定模型计算（如矩阵乘法、激活函数）时使用的数据类型
    bnb_8bit_use_double_quant=True,  # 双量化，进一步压缩
)
# 加载模型
model = AutoModelForCausalLM.from_pretrained(
    model_name, 
    quantization_config=bnb_config
)
```

# 五、调参经验总结

| 参数          | 作用       | 推荐范围          |
| ------------- | ---------- | ----------------- |
| r             | 低秩维度   | 4 ~ 16            |
| lora_alpha    | 缩放比例   | 16 ~ 32           |
| lora_dropout  | 防止过拟合 | 0.05 ~ 0.1        |
| learning_rate | 学习率     | 1e-5 ~ 5e-5       |
| batch_size    | 批次大小   | 1 ~ 4（根据显存） |

**实践经验：**

- 小任务可用 r=8, α=16；
- 若显存不足 → 使用 QLoRA；
- 验证时加载 LoRA adapter 即可，不需要重新训练全模型

# 六、面试高频问答_LoRA 八股

| 问题                               | 答案要点                                              |
| ---------------------------------- | ----------------------------------------------------- |
| LoRA 的核心思想是什么？            | 低秩分解，只训练少量参数（A,B矩阵）以适应新任务。     |
| 为什么 LoRA 节省显存？             | 冻结原参数，仅训练小矩阵，梯度更新范围小。            |
| LoRA 插入 Transformer 的哪个部分？ | 通常是 Q_proj、V_proj 层（Attention中的线性变换层）。 |
| LoRA 与 QLoRA 的区别？             | QLoRA 在量化模型上应用 LoRA，显存占用更低。           |
| LoRA 训练后如何推理？              | 加载 base 模型 + LoRA adapter 合并推理。              |
| LoRA 能用于哪些模型？              | GPT、LLaMA、ChatGLM、Qwen、Baichuan 等主流架构。      |

# 七、一些疑问

| Question                       | ANSWER                                       |
| ------------------------------ | -------------------------------------------- |
| LoRA为什么在预训练中也可以使用 | 预训练需要更新权重，涉及权重更新就可以用LoRA |
|                                |                                              |
|                                |                                              |

# LoRA

## 为什么需要 LoRA?解决参数效率

> 在大模型微调中，**传统全参数微调**存在问题： 
>
> **问题一：参数太多**
>
> - LLaMA-7B：70 亿参数
> - 全参数微调 = 每个任务都存一份模型 
>
> **问题二：显存和计算成本高**
>
> - 反向传播所有参数
> - 对实习生/公司 infra 不友好
>
> **问题三：灾难性遗忘**
>
> - 全量更新可能破坏预训练知识

## LoRA的核心思想

> 权重更新是低秩的（Low-Rank）

## LoRA的数学形式

$$
原始线性层： \\
𝑦=𝑊𝑥 \\
LoRA 的做法：\\
冻结原始权重 W，只学习一个增量 ΔW：𝑊′=𝑊+Δ𝑊 ，其中 Δ𝑊=𝐵𝐴
$$

```
低秩分解 rank=r  W=d*d B=d*r A=r*d 
```

**前向传播变成：**
$$
𝑦=(𝑊+𝐵𝐴)𝑥=Wx+BAx
$$

## 为什么LORA有效

```
1：模型已经“学会语言”
预训练模型已经掌握：语法世界知识表达能力
微调只是：在原有能力上做小幅方向调整

2：权重变化是低秩的
全参微调实际“重要更新方向”很少,LoRA 正好捕捉这些方向

3：类似“插件”
原模型 = 操作系统	LoRA = 小插件 多任务 = 多 LoRA 推理时可以随时插拔
```

## A 和 B 两个矩阵怎么初始化，有了解过其他的初始化方法吗

```
矩阵 A（升维矩阵）
初始化方法：正态分布初始化 N(0,σ2)，其中 σ=rα​
关键参数：r 是 LoRA 的秩（通常取 8、16、32），α 是缩放系数（和 r 绑定，用于平衡 LoRA 增量的贡献）
作用：保证 A 的输出分布和预训练权重的梯度分布匹配，避免初始化值过大 / 过小导致训练震荡。
矩阵 B（降维矩阵）
初始化方法：全零初始化
作用：确保微调初始阶段，LoRA 增量 BA=0，模型输出完全等于预训练权重 W0​ 的输出，实现 “平滑起步”，避免破坏预训练模型的通用知识。
训练后缩放逻辑前向传播时，LoRA 增量会乘以 rα​，即：output=W0​x+rα​BAx这个缩放操作让不同秩 r 下的 LoRA 增量贡献保持稳定，方便超参调优。

若 B 非零，初始阶段 BA 会带来较大增量，直接覆盖预训练权重 W0​ 的输出，破坏模型的通用知识，导致微调效果暴跌。
```

```
针对 LoRA 场景

若 A、B 是 LoRA 的低秩矩阵，那么 B 用全零初始化，保证初始增量为 0；A 用正态分布 N(0,α/r) 初始化，α 是缩放系数，r 是秩，这样能平衡增量贡献，避免训练震荡。


针对通用矩阵场景

通用矩阵初始化需结合激活函数：ReLU/GELU 用 He 初始化，tanh 用 Xavier 初始化；正交初始化适合循环层或 Attention 矩阵；全零初始化绝对不能用于普通层，但可用于 LoRA 的 B 矩阵
```

## LoRA用在Transformer的哪里

> “一般只对 Attention 的 Q/V 做 LoRA，性价比最高”

> Attention 中的：Wq、Wk、Wv，有时加 Wo，很少用于 FFN（但不是不行）

## LoRA的优点

> 参数量小 显存占用低 训练速度快 原模型不被破坏  多任务可共享一个 base model

## LoRA的局限

> 表达能力受 rank 限制	对大幅任务迁移效果有限	rank 选择需要调参

## LoRA与全参微调的区别

| 维度       | 全参数微调 | LoRA     |
| ---------- | ---------- | -------- |
| 参数更新   | 全部       | 低秩增量 |
| 显存       | 高         | 低       |
| 训练速度   | 慢         | 快       |
| 灾难性遗忘 | 易发生     | 较少     |
| 多任务部署 | 困难       | 易插拔   |

##  LoRA 为什么比 Adapter 更好？

> Adapter 在网络中**插新层**
> LoRA 不改结构，只改权重表示
> LoRA 在推理时可以合并权重，**无额外推理开销**

## LoRA 的 rank r 越大越好吗？

> r 太小：表达能力不足
> r 太大：接近全参数微调
> 常用 r = 4 / 8 / 16

##  LoRA 的 scaling（α）是干嘛的？

LoRA 实际使用的是：
$$
W' = W + \frac{\alpha}{r} BA
$$
作用：

> 控制 **LoRA 更新幅度**，防止训练不稳定

##  LoRA 会影响推理速度吗？

 ```
- 训练时：略慢（多一条 BAx）
- 推理时：
    - 可以把 BA 合并进 W
    - **推理速度 ≈ 原模型**
 ```

##   为什么通常只给 Q/V 加 LoRA？

> **Q/V 决定注意力分布**，**对任务适配最敏感**，**参数量和收益比最高**

## LoRA vs Prefix-Tuning？

|          | LoRA | Prefix |
| -------- | ---- | ------ |
| 改哪里   | 权重 | 输入   |
| 适配能力 | 强   | 较弱   |
| 稳定性   | 高   | 一般   |

##  LoRA 适合哪些任务

> 适合 :指令微调 对话 文本分类  NLU/NLG
> 不适合:强结构变化任务（如数学推理迁移）

## LoRA 会不会过拟合？

>参数少 → 不容易过拟合
>小数据场景优势明显

## LoRA 的参数量怎么算？

$$
Params=r(din+dout)
$$

## LoRA 可以用于 CNN / MLP 吗？

> 可以，本质是线性层低秩更新。

## 多个 LoRA 可以叠加吗？

$$
W' = W + \sum_i B_i A_i
$$

## 实际工程中 LoRA 怎么用？

>base model 冻结, 每个任务一个 LoRA,推理按需加载

# QLoRA

> QLoRA = 量化的 Base Model + FP16 的 LoRA 微调

## QLoRA要解决什么问题?

> Base Model 仍然很大,训练时显存主要来自：**参数+梯度+Optimizer states**

> **解决显存瓶颈**

## QLoRA 的核心思想

> **Base Model 使用 量化** : 冻结不更新极致省显存
> **LoRA 参数保持 FP16 / BF16**:  保证训练稳定,  避免量化噪声
> **反向传播只经过 LoRA**:	Base Model 不需要高精度梯度

## QLoRA 的整体结构

Forward：
$$
y = W_q x + BAx \\
  W_q：量化权重（冻结）\\
  BA：LoRA（FP16）
$$

Backward：

> 不更新 W_q, 只更新 A, B

## 为什么有的 INT4，有的用 NF4？

```py
# 基础4bit配置（旧）
bnb_config_old = BitsAndBytesConfig(
    load_in_4bit=True,
    llm_int4_threshold=6.0,
    llm_int4_has_fp16_weight=False,
)

# QLoRA-NF4配置（新，推荐）
bnb_config_new = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",  # 替换为NF4
    bnb_4bit_compute_dtype=torch.float16,  # 计算精度FP16
    bnb_4bit_use_double_quant=True,  # 启用双量化
)
```

> INT4 是通用 4bit 整数量化，简单但精度损失大；NF4 是大模型定制浮点量化，精度高、显存省，是 QLoRA 核心；

两者核心差异是**是否针对大模型正态分布权重做定制化设计**，NF4 是工业界落地 QLoRA 的标准选择。

NF4 的特点：专为神经网络设计非对称、非均匀,对零附近精度更高

“QLoRA 使用 NF4 量化，因为它更符合权重的正态分布假设。”

## Double Quantization

> 双量化是**对 4bit 量化的「缩放因子（scale）」再做一次 8bit 量化**，在几乎不损失精度的前提下，进一步降低模型权重的显存占用。

**普通4bit量化(包括 NF4）**

>**核心权重值**：以 4bit 存储（如 NF4 格式）；
>
>**缩放因子（scale）**：用于将量化后的 4bit 值还原为接近原始精度的数值，默认以 FP16/FP32 存储。

> **缩放因子本身数量不多，但会产生 “显存碎片” 和 “冗余占用”**

**双量化的工作逻辑: 对scale 再量化一次**

>第一步：对模型原始权重做**第一层量化**（如 NF4 4bit 量化），得到 4bit 权重值 + FP16 缩放因子；
>第二步：对 FP16 缩放因子做**第二层量化**（8bit 整数量化），将缩放因子从 FP16 压缩为 8bit；
>推理 / 训练时：先解量化 8bit 缩放因子到 FP16，再用它解量化 4bit 权重值，全程仅增加极少量计算开销，精度损失可忽略。

**为什么用双量化?**

> **显存节省**：7B 模型可额外节省～0.7GB 显存，让单卡（如 4090）更易装下 7B 模型并完成微调；
> **精度影响**：缩放因子本身是 “辅助校准值”，8bit 量化足够保留其精度，对模型最终效果几乎无影响；
> **无额外成本**：仅增加极少量解量化计算，相比显存收益可忽略。

## Paged Optimizer（paged Adam）

```
问题：
  - Adam 的 optimizer states 很大
  - 容易 OOM
解决：
  - 使用 **CPU / GPU 统一内存**
  - 显存像“分页”一样动态调度
```

##   QLoRA 的显存来源

```
训练显存 ≈
1️⃣ 4-bit base weights
2️⃣ LoRA 参数（FP16）
3️⃣ LoRA 梯度
4️⃣ Optimizer states（paged）
5️⃣ Activation（checkpoint 可降）
```

##  QLoRA 为什么不会精度崩？

 ```
 **关键原因：**
 - Base Model **冻结**
 - LoRA 承担全部任务适配
 - NF4 保证前向近似精度
 - 不反传量化权重梯度
 ```

> 面试总结句：“QLoRA 把量化误差限制在前向，不影响反向的可学习空间。”

## QLoRA 的局限性

```
❌ 训练速度慢于 LoRA
❌ 对 kernel / bitsandbytes 依赖强
❌ Debug 困难
❌ 量化噪声对极小数据集敏感
```

## 为什么 QLoRA 不量化 LoRA 参数？

- LoRA 是可学习参数
- 量化会导致梯度不稳定
- 量化噪声直接影响收敛

## NF4 为什么比 INT4 好？

- 权重分布近似正态
- NF4 非均匀量化
- 零附近精度高

## QLoRA 训练时哪些部分在 GPU？

>**核心计算部分全在 GPU，仅极少量非核心数据在 CPU**，下面拆解具体分布逻辑（适配面试答题的 “精准 + 易懂” 要求）。

**一、 QLoRA 训练时 GPU 上的核心组件（必答）**

```
QLoRA 为了最大化单卡效率，把所有 “计算相关” 的部分都放在 GPU，具体包括：

 1. **基座模型权重**：以 **NF4 4bit 精度** 加载并常驻 GPU（核心），这是 QLoRA 显存省的关键 ——7B 模型仅占～3.5GB GPU 显存；

 2. **LoRA 适配器参数**：以 **FP16 精度** 加载在 GPU，且是唯一参与梯度更新的部分（参数量仅占基座的 0.02%~0.1%）；

 3. 优化器状态（PagedAdamW）

    - 活跃的优化器状态页（动量 / 方差）以 8bit/4bit 精度加载在 GPU；
    - 闲置页暂存于 CPU 内存，按需换入 GPU（无精度损失）；
 4. **计算中间值**：前向 / 反向传播的激活值、梯度值，以 FP16 精度在 GPU 计算并临时存储；
 5. **KV Cache（训练 / 推理共用）**：以 FP16 精度在 GPU 缓存，避免重复计算 Attention；
 6. **批量数据**：当前训练批次的输入 / 标签张量，经 tokenizer 编码后加载到 GPU
```

  **二、 仅在 CPU 上的非核心部分（补充答）**

```
这些部分不参与计算，仅做 “数据中转”，对训练速度无影响：

 1. **闲置的优化器状态页**：PagedAdamW 拆分后的非活跃页，暂存于 CPU 内存（需时换入 GPU）；
 2. **完整数据集**：未进入当前批次的原始数据 / 编码后数据，存在 CPU 内存（按批次加载到 GPU）；
 3. **模型 / 训练配置文件**：如 `BitsAndBytesConfig`、`TrainingArguments` 等纯配置信息；
 4. **日志 / 监控数据**：训练过程中的 loss、步数等统计信息，实时从 GPU 同步到 CPU 记录。
```

>QLoRA 训练时 **核心计算全在 GPU**（4bit 基座、FP16 LoRA、活跃优化器状态）；
>CPU 仅存闲置优化器页、未加载数据集等非计算数据；

## QLoRA 会比 LoRA 慢在哪里？

- 量化解码开销
- memory access 增多
- kernel 复杂度提升

## QLoRA 如何避免 OOM？

- 4-bit base
- paged optimizer
- gradient checkpointing

## QLoRA vs DeepSpeed ZeRO？

- ZeRO 是参数/状态切分
- QLoRA 是参数表示压缩
- 二者可叠加

## QLoRA 和 Adapter 谁更适合小数据？

- QLoRA 参数更少
- 更不易过拟合
- Adapter 插层影响推理

## QLoRA 中量化误差会累积吗？

- 不反向传播
- 只存在前向
- LoRA 学习补偿误差

## QLoRA 是否适合训练底座模型？

**答：**

- 不适合
- 底座需要高精度梯度
- QLoRA 只适合下游微调