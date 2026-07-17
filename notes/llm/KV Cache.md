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

# 