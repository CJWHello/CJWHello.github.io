## Attention

***请详细推导 Self-Attention 的计算过程：***

> $$
> \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
> $$

>1. **线性变换**：
>
> 输入 $X \in \mathbb{R}^{n \times d}$，通过三个权重矩阵生成 Q、K、V
>
> $$Q = XW^Q, \quad K = XW^K, \quad V = XW^V$$,其中 $W^Q, W^K \in \mathbb{R}^{d \times d_k}$，$W^V \in \mathbb{R}^{d \times d_v}$
>
>2. **计算注意力分数**：
>
> $$S = \frac{QK^T}{\sqrt{d_k}} \in \mathbb{R}^{n \times n}$$
>
>3. **Softmax 归一化**：
>
> 对每一行做 softmax: $$A = \text{softmax}(S) \in \mathbb{R}^{n \times n}$$
>
>4. **加权求和**：
>
> $$\text{Output} = AV \in \mathbb{R}^{n \times d_v}$$

>$$
>1. 初始参数定义\\
>X = \begin{pmatrix} 1 & 0 & 1 \\ 0 & 2 & 1 \end{pmatrix}, \quad 
>W^Q = \begin{pmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 1 \end{pmatrix}, \quad 
>W^K = \begin{pmatrix} 0 & 1 \\ 1 & 0 \\ 0 & 1 \end{pmatrix}, \quad 
>W^V = \begin{pmatrix} 1 & 2 \\ 0 & 1 \\ 1 & 0 \end{pmatrix} \hfill
>$$

>$$
>2. 线性变换生成 Q, K, V
>Q = XW^Q = \begin{pmatrix} 2 & 1 \\ 1 & 3 \end{pmatrix}, \quad K = XW^K = \begin{pmatrix} 0 & 2 \\ 2 & 1 \end{pmatrix}, \quad V = XW^V = \begin{pmatrix} 2 & 2 \\ 1 & 2 \end{pmatrix} \hfill
>$$

>$$
>3. 计算注意力分数 S（\sqrt{d_k} = \sqrt{2} \approx 1.414）\\
>S = \frac{QK^T}{\sqrt{d_k}} = \frac{1}{1.414} \begin{pmatrix} 2 & 1 \\ 1 & 3 \end{pmatrix} \begin{pmatrix} 0 & 2 \\ 2 & 1 \end{pmatrix} = \frac{1}{1.414} \begin{pmatrix} 2 & 5 \\ 6 & 5 \end{pmatrix} \approx \begin{pmatrix} 1.41 & 3.54 \\ 4.24 & 3.54 \end{pmatrix} \hfill
>$$

>$$
>4. Softmax 行归一化\\
>A = \text{softmax}(S) \approx \begin{pmatrix} \text{softmax}([1.41, 3.54]) \\ \text{softmax}([4.24, 3.54]) \end{pmatrix} = \begin{pmatrix} 0.11 & 0.89 \\ 0.67 & 0.33 \end{pmatrix} \hfill
>$$

>$$
>5. 加权求和输出\\
>\text{Output} = AV = \begin{pmatrix} 0.11 & 0.89 \\ 0.67 & 0.33 \end{pmatrix} \begin{pmatrix} 2 & 2 \\ 1 & 2 \end{pmatrix} = \begin{pmatrix} 1.11 & 2.00 \\ 1.67 & 2.00 \end{pmatrix} \hfill
>$$

 ***为什么要除以 $\sqrt{d_k}$***？

> 在 Self-Attention 中，除以 $\sqrt{d_k}$（缩放因子）是为了**防止点积结果过大，导致 Softmax 函数进入饱和区，进而引发梯度消失问题**。

> 反例说明：
> $$
> 直接计算指数（未缩放）：\\
> e^{20} \approx 4.85 \times 10^8\\e^{10} \approx 22026.47\\
> 由于 e^{20} 远大于 e^{10}，两者相加时，e^{10} 几乎可以忽略不计\\
> A = \left[ \frac{4.85 \times 10^8}{4.85 \times 10^8 + 22026}, \frac{22026}{4.85 \times 10^8 + 22026} \right] \approx [1.0, 0.0] \hfill
> $$

> 不除以 $\sqrt{d_k}$后果：
>
> **变成独热编码（One-Hot）：** 权重变成了 $[1.0, 0.0]$。这意味着模型把所有的注意力都绝对地集中在了分数最高的那一个 Token 上，完全丧失了“多角度融合上下文信息”的能力**。**
>
> **梯度消失（Gradient Vanishing）：**$A \approx [1.0, 0.0]$时，**此时 Softmax 的梯度几乎为 0**。反向传播时，梯度传到这里就断了，前面的权重矩阵 $W^Q, W^K$ 将无法进行任何参数更新，模型停止训练。

***Multi-Head Attention(MHA) 和 Grouped-Query Attention (GQA)的区别是什么？MHA、MQA、GQA 的区别是什么？为什么大模型常用 GQA？***

> 区别在于  Query（Q）有多少组 head，以及 Key/Value（K/V）是否共享。
> MHA：每个 attention head 都有：自己的 Q K V  ；**表达能力强，但是推理 KV Cache巨大**
> MQA：Q 仍然多个 heads，但所有 heads 共用同一个 K/V **容易掉性能**
> GQA：Query heads 分组。每组共享 K/V。
> MHA里，每个 attention head 都有自己独立的 Q,K,V投影；而 GQA会保留很多个 Query head，但让多个 Query head 共享同一组 K,V，本质上是“Q 多头、KV 少头”。例如 32 个 query heads 可能只对应 8 个 KV heads

>常用GQA核心原因：GQA 在“效果损失极小”的情况下，大幅降低了 KV Cache。这是工程上的巨大收益。

***为什么要减少 KV heads？***

> **减少 KV heads 是因为推理阶段真正占显存和带宽的是 KV cache，而不是 Query；**每生成一个 token，都要把所有历史 token 的 K,VK,VK,V 保存下来，如果像传统 MHA 那样每个 query head 都有独立 KV heads，cache 会非常大，所以 GQA 用“多个 Q 共享一组 KV”来减少缓存规模。

***repeat_kv逻辑***

>```
>def repeat_kv(x, n_rep):
># x:
># [batch, kv_heads, seq, dim]
>
>return x[:, :, None, :, :] \
>.expand(batch, kv_heads, n_rep, seq, dim) \
>.reshape(batch, kv_heads * n_rep, seq, dim)
>```
>
>repeat_kv 只是“逻辑共享”,并不是真的重新计算 KV，运行时 `repeat_kv` 是把 K/V 在 head 维度扩展到 query head 数，方便计算 attention；参数上并不是存了 \(n_q\) 份 K/V 投影，而是只学习 \(n_{kv}\) 组。


***Flash Attention是什么？技术上如何实现？***

>平铺（Tiling，或称分块）FlashAttention 将输入的长矩阵切分成一个个小方块（Blocks）。\\
>操作： 它将 Q, K, V 分块载入到 GPU 的 SRAM（高速缓存）中。\\
>效果： 在 SRAM 里直接计算小块的 Attention，计算完成后直接把最终结果写回 HBM。\\
>这样不需要在外部显存中存储那个巨大的 N \times N 中间矩阵，显存占用从 O(N^2) 骤降到 O(N)。

>在线 Softmax 重标度（Online Softmax Rescaling）传统的 Softmax 计算公式 $\frac{e^{x_i}}{\sum e^{x_j}}$ 需要知道全局的最大值和总和。分块（Tiling）后，每个小块只能看到局部数据，无法直接计算全局 Softmax。
>**解决办法：** FlashAttention 引入了**在线重标度**算法。在分块遍历计算时，动态维护和更新当前见到的最大值和指数和。
>**操作：** 当计算到下一个新分块时，利用数学公式对前一个分块的局部 Softmax 结果进行**按比例缩放（Rescaling）**，从而在不需要读取全局数据的情况下，精准还原出全局 Softmax 的结果。
