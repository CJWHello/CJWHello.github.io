---
title: "读 VLM 论文时，我更想先抓住输入输出"
date: "2026-07-12"
tags: ["VLM", "论文"]
cover: "./assets/images/project-nexus.svg"
excerpt: "很多 VLM 论文细节很密，但先看清数据流、视觉 token 怎么进入语言模型，理解会稳很多。"
---

![VLM paper notes](./assets/images/project-nexus.svg)

最近读 VLM 相关论文时，我发现自己最容易被模块名和公式带走。  
更好的顺序反而是先画一张输入输出图：

1. 图像或视频如何切成视觉 token
2. 视觉 token 如何和文本 token 对齐
3. 模型在哪些层发生跨模态交互
4. 最终 loss 或 reward 到底约束了什么

这比一上来追逐所有细节更稳定。
