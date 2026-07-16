# Transformer 笔记

# 为什么提出 Transformer

**RNN和LSTM存在的问题：**无法并行计算（时间步依赖）长距离依赖难学习梯度消失/爆炸训练速度慢

**Transformer：**完全基于 Attention，并行计算、长距离建模能力强、GPU利用率高、易扩展（大模型基础）

---

# 整体结构

<img src="./assets/images/transformer-architecture.png" alt="Transformer 整体结构图" style="display:block; max-width:720px; width:100%; margin:1.4em auto;" />

Transformer 整体采用 **Encoder-Decoder 架构**，由编码器和解码器两部分组成，每部分都由多个相同的层堆叠而成。

# 数据流

> 简短概括—数据流：**输入 → Embedding → Position Encoding → Encoder → Decoder → Linear → Softmax → 输出。**

## Embedding

输入文本经过 **Embedding**，每个 Token 映射为固定维度的向量。例如：我  ——>   [0.7,-0.4,0.2,0.3,0.5,……]

## Position Encoding

Transformer 中的 Self-Attention 本身是**置换不变**的。对于Self-Attention，“我爱AI”和“AI 爱我”是一样的。如果没有位置编码，模型只知道有哪些 Token，不知道它们的顺序，因此无法理解语义。所以必须加入位置信息。之后进入Encoder

## Encoder

每个 Encoder 层都包含两个核心模块：Multi-Head Self-Attention（多头自注意力MHA）和Feed Forward Network（前馈神经网络FFN）。其中，每个子模块后都会进行 Residual（残差连接） 和 Layer Normalization（层归一化），最终输出的是整个输入序列的上下文表示，然后进入 Decoder。

> 后文都使用相关缩写：MHA FFN 

## Decoder 

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
\begin{aligned}
x_i &= e_i + p_i \\
x_1 &=
\begin{bmatrix}
1\\
2
\end{bmatrix}
+
\begin{bmatrix}
0.1\\
0.2
\end{bmatrix}
=
\begin{bmatrix}
1.1\\
2.2
\end{bmatrix}
\end{aligned}
$$

## RoPE 的做法

由Embedding向量X得到Q、 K，对Q、K 做旋转：Q'=RoPE(Q) 、K'=RoPE(K)，旋转后的 Q、K 进行点积时，结果只与两个 token 的相对位置差有关，因此将位置信息引入 Attention。

> 旋转公式为：
> $$
> \begin{aligned}
> \begin{bmatrix}
> x'_{2i}\\
> x'_{2i+1}
> \end{bmatrix}
> &=
> \begin{bmatrix}
> \cos(m\theta_i)&-\sin(m\theta_i)\\
> \sin(m\theta_i)&\cos(m\theta_i)
> \end{bmatrix}
> \begin{bmatrix}
> x_{2i}\\
> x_{2i+1}
> \end{bmatrix}
> \end{aligned}
> $$

> $$
> \theta_i=（1/10000）^{2i/d}。
> $$

**位置无关**
$$
\begin{aligned}
Q' &= R_m Q,\qquad K' = R_n K \\
Q'^T K' &= (R_m Q)^T (R_n K) = Q^T R_{n-m} K \\
R_m^T R_n &= R_{n-m}
\end{aligned}
$$
两个 token 的相对距离n-m，因此结果只与两个 token 的相对位置差有关,同时也将位置信息引入 Attention

# Self Attention

Self-Attention 的作用是让每个 Token 都能够关注输入序列中的所有 Token，从而学习全局上下文信息；

Transformer 的输入首先经过 Embedding 得到每个 token 的表示，记作 **X~i~**。然后通过三个不同的**可学习权重矩阵**进行线性变换。

> Q~i~=X~i~W~Q~、K=X~i~W~k~、V=X~i~W~v~。

Q 可以理解成：当前这个词想从上下文中寻找什么信息。K：我有什么标签？我是什么？ V：具体的语义。每个token都有对应的QKV

## Attention计算

$$
\begin{aligned}
\mathrm{Attention}(Q,K,V) &= \mathrm{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
\end{aligned}
$$

1.当前词Q ~m~和所有 K做点积计算相似度,得到score ~i~

2.Score=[score ~0~, score ~1~,……]，除√d~k~，Attention=Softmax(Score)，得到权重向量【0.2，0.3，0.5】

3.Output ~m~ =0.2V1+0.3V2+0.5V3，得到Output矩阵其中一个向量

为了增强模型表达能力，Transformer 使用 **Multi-Head Attention**。也就是把 Attention 分成多个 Head，每个 Head 学习不同类型的关系，比如语义关系、位置关系、句法关系等，最后再拼接起来。

---

## 为什么除 √d~k~

除以 $\sqrt{d_k}$ 是为了避免点积过大导致 Softmax 饱和，使训练更加稳定。

没有缩放：Score=[10,2,1]，Softmax=[0.999,0.0009,0.0003]，几乎全部注意力给第一个 token。这种情况叫**Softmax 饱和**

**问题：**
$$
\begin{aligned}
\mathrm{softmax}(x_i) &= \frac{e^{x_i}}{\sum_j e^{x_j}} \\
\frac{\partial \,\mathrm{softmax}}{\partial x} &\to 0
\end{aligned}
$$

# 残差连接Residual

Transformer的残差连接，存在于两个地方：

- Attention：X′=X+Attention(X) 
- Feed Forward ：Output=X'+FFN(X')

> 为什么需要残差？

**解决深层网络梯度消失**：

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

# 10. Mask
