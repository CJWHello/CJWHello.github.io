## KV cache

***为什么使用KV cache?***

>当模型继续生成下一个 token 时，新 token 的 Query 只需要去和之前所有 token 的 K 做 attention,Q 只和当前 token 有关：

$$
Attention(Q_t,K_{1:t},V_{1:t})
$$

***KV Cache数据结构***

>```
>past_key_values = [
>(k_layer0, v_layer0),
>(k_layer1, v_layer1),
>...
>]
>[batch, kv_heads, past_seq_len, head_dim]
>k.shape = [B, H, T, D]
>v.shape = [B, H, T, D]
>```

***KV Cache 为什么如此重要？***
$$
KV Cache∝sequence length×KV heads×head dimension
$$
***KV Cache怎么计算?***

> KV Cache大小（字节）=2×批大小×序列长度×KV头数量×每个头的维度×Transformer层数×每个元素的字节数
>
> | 项               | 含义                                                   |
> | ---------------- | ------------------------------------------------------ |
> | 2                | 因为要存 Key 和 Value 两份                             |
> | 批大小           | 一次同时推理多少条请求                                 |
> | 序列长度         | 当前上下文 token 数                                    |
> | KV头数量         | 真正存储的 Key/Value head 数（GQA 会比 Query head 少） |
> | 每个头的维度     | 单个 attention head 的 hidden dim                      |
> | Transformer层数  | 每层都要保存 KV Cache                                  |
> | 每个元素的字节数 | FP16=2字节，BF16=2字节，FP8=1字节                      |

# Transformer 推理中的 KV Cache 笔记

## 1. 为什么推理需要 KV Cache？

Transformer Decoder 在推理阶段采用**自回归生成（Autoregressive Generation）**：

例如生成：

```
我 → 爱 → 你
```

每一步根据已有 token 预测下一个 token。

Self-Attention 公式：

[
Attention(Q,K,V)=softmax(\frac{QK^T}{\sqrt{d_k}})V
]

生成新 token 时：

* 当前 token 需要一个新的 Query（Q）
* 需要查看之前所有 token 的 Key（K）
* 需要读取之前所有 token 的 Value（V）

如果没有 KV Cache：

生成第 1000 个 token 时，需要重新计算前面 999 个 token 的 K 和 V。

计算过程：

```
token1~token999
        |
        v
重新计算 K,V
        |
        v
Attention
```

大量重复计算。

---

有 KV Cache：

历史 token 的 K/V 已经保存：

```
K Cache:
[K1,K2,K3,...]

V Cache:
[V1,V2,V3,...]
```

生成新 token 时：

只计算当前 token 的：

```
Q_new
K_new
V_new
```

然后：

* Q 用于当前 Attention
* K/V 追加到 Cache

因此大幅提升推理速度。

---

# 2. KV Cache 保存什么？

保存的是：

> **每一层 Transformer Decoder 的历史 token 的 Key 和 Value。**

结构：

```
KV Cache

Layer 1:
    K cache
    V cache

Layer 2:
    K cache
    V cache

Layer 3:
    K cache
    V cache

...

Layer N:
    K cache
    V cache
```

---

# 3. 为什么每一层都需要保存？

因为不同 Transformer 层的 K/V 不一样。

原因：

### ① 每层参数不同

每层都有自己的：

[
W_Q,W_K,W_V
]

例如：

第1层：

[
K_1=X_1W_{K1}
]

第2层：

[
K_2=X_2W_{K2}
]

因此：

[
K_1 \neq K_2
]

---

### ② 每层输入 hidden state 不同

Transformer：

```
Input
 |
Layer1
 |
Layer2
 |
Layer3
```

每层接收到的 hidden state 都不同：

```
Layer1 hidden
Layer2 hidden
Layer3 hidden
```

所以产生的：

```
K,V
```

也不同。

---

# 4. 为什么只缓存 K 和 V，不缓存 Q？

核心原因：

> **历史 token 的 Q 后续不会再被使用，而历史 token 的 K/V 会不断被未来 token 查询。**

---

举例：

已经生成：

```
我 爱
```

下一步生成：

```
你
```

需要：

[
Q_3[K_1,K_2]
]

也就是：

当前 Query：

```
Q3
```

查询历史：

```
K1,K2
```

读取：

```
V1,V2
```

---

但是不会计算：

[
Q_2[K_1]
]

因为：

"爱" 这个位置的 Q 只在生成 "爱" 时使用过。

所以：

```
历史 Q:

Q1 ❌
Q2 ❌
Q3 ❌

不用保存
```

只有：

```
K1,K2...
V1,V2...
```

需要保存。

---

# 5. 新 token 的 V 是怎么来的？

新 token 生成后：

例如：

```
我 爱 → 你
```

"你"成为新的输入。

---

进入 Decoder：

## Step 1：Embedding

token：

```
你
```

变成：

[
x_{new}
]

---

## Step 2：经过 Transformer Layer

在某一层：

计算：

[
Q=xW_Q
]

[
K=xW_K
]

[
V=xW_V
]

因此：

[
\boxed{V_{new}=x_{new}W_V}
]

得到：

```
V(你)
```

---

## Step 3：加入 KV Cache

原来：

```
K:
[K(我),K(爱)]

V:
[V(我),V(爱)]
```

新增：

```
K(你)
V(你)
```

变成：

```
K:
[K(我),K(爱),K(你)]

V:
[V(我),V(爱),V(你)]
```

---

# 6. KV Cache 推理完整流程

假设生成：

```
我 爱 你
```

---

## 第一步：

输入：

```
我
```

每层计算：

```
Q1,K1,V1
```

保存：

```
KV Cache:
K1,V1
```

---

## 第二步：

输入：

```
我 爱
```

不用重新算：

```
我
```

只计算：

```
Q2,K2,V2
```

更新：

```
K:
[K1,K2]

V:
[V1,V2]
```

---

## 第三步：

输入：

```
我 爱 你
```

只计算：

```
Q3,K3,V3
```

更新：

```
K:
[K1,K2,K3]

V:
[V1,V2,V3]
```

---

# 7. 为什么 KV Cache 会占显存？

因为保存：

```
层数 × token数量 × hidden维度 × K/V
```

大致：

[
Memory \propto
Layers \times SequenceLength \times HiddenSize
]

影响因素：

| 因素             | 影响          |
| -------------- | ----------- |
| 模型层数增加         | KV Cache 增大 |
| 上下文长度增加        | KV Cache 增大 |
| Batch 增大       | KV Cache 增大 |
| Hidden size 增大 | KV Cache 增大 |

所以长上下文大模型推理时，KV Cache 可能占大量显存。

---

# 8. 面试版总结（推荐背）

> **KV Cache 是 Transformer Decoder 自回归推理中的优化技术。由于历史 token 的 Key 和 Value 在后续生成过程中不会变化，因此将每层历史 token 的 K 和 V 缓存起来。生成新 token 时，只需要计算当前 token 的 Q、K、V，其中 Q 用于当前 Attention，新的 K/V 追加到 Cache 中。这样避免重复计算历史 token 的 Attention 投影，提高生成速度，但代价是需要额外显存存储每层的 KV。**

---

## 核心记忆口诀

> **Q 是当前问题，用完即丢；K 是索引，V 是信息，需要长期保存。**
> **新 token 产生新的 K/V，历史 K/V 不变，只追加。**
> **每层都有自己的 K/V，所以 KV Cache 按层存储。**
