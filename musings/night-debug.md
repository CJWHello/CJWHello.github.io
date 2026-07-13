---
title: "夜里 Debug：真正难的是承认方向错了"
date: "2026-07-10"
tags: ["心情", "工程"]
cover: "./assets/images/project-dashboard.svg"
excerpt: "有时候 bug 本身不难，难的是停下来承认假设错了，换一条更朴素的验证路径。"
---

![night debug](./assets/images/project-dashboard.svg)

今晚卡在一个很小的实现细节上。  
代码看起来每一步都合理，但结果就是不对。后来发现问题不在实现，而在最开始的假设。

我越来越觉得 Debug 最有价值的动作不是加更多 print，而是问：

- 我现在相信的前提是什么？
- 哪一个前提最容易被验证？
- 如果它是错的，我愿不愿意立刻换路线？

工程和科研的共同点，大概都是要及时放下漂亮但错误的解释。
