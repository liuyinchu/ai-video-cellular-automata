# 科学核查与来源

- 康威生命游戏：Moore 邻域八格，不计自身。B3/S23：死元胞有三邻居时诞生；活元胞有二或三邻居时存活。所有元胞同步更新。资料：[LifeWiki](https://conwaylife.com/wiki/Conway%27s_Game_of_Life)、Nathaniel Johnston 与 Dave Greene 的 [Conway’s Game of Life: Mathematics and Construction](https://conwaylife.com/book/)。
- 方块周期为一；闪烁器周期为二。滑翔机四代后沿对角方向各平移一格，速度 c/4。资料：[Glider](https://conwaylife.com/wiki/Glider)。代码测试直接验证集合相等与平移。
- Gosper gun 原始 RLE：36 个活元胞，边界框 36×9，周期 30。资料：[Gosper glider gun](https://conwaylife.com/wiki/Gosper_glider_gun)。源图案以公开标准 RLE 实现。代码检查初始元胞数、三十代核心重复与增长。
- 一维二状态、半径一的基本元胞自动机：三格邻域有 2³=8 种输入，8 个二进制答案构成规则。输出按 111→000 顺序读取，90 为 01011010、30 为 00011110、110 为 01101110。
- 规则 90 等价于左右元胞 XOR。资料：Stephen Wolfram, [A New Kind of Science — Cellular Automaton Rules as Formulas](https://www.wolframscience.com/nks/notes-2-1--cellular-automaton-rules-as-formulas/)。全八种输入由测试验证。
- 规则 30 是确定性的；片中不声称它是数学意义上的随机过程，也不声称已证明其任意统计性质。所有图案是固定初始条件的真实演化。
- 规则 110 的计算通用性依据 Matthew Cook, “Universality in Elementary Cellular Automata”, Complex Systems 15 (2004), 1–40。[原始论文](https://www.complex-systems.com/pdf/15-1-1.pdf)。通用性涉及精心准备的初始条件和背景，不等于单个亮点能自动变成一台可用计算机。

## 显示约定

- 蓝：存活或已有结构；黄：新生、重点、信息；红：消失过渡；灰：网格、上下文。
- 状态变化使用短插值强调同步变化；每代结束后的二值状态与演化计算完全一致。
- 空间二维视图可能裁去无限平面的画面外部分；演化逻辑不把可见视窗边缘作为边界。
- 一维时空图的纵轴是代数，横轴是位置；两轴显示比例不同，不代表物理传播速度。

## 来源访问

制作日期：2026-10-21，Asia/Shanghai。
渲染器：[Multiplane](https://github.com/LBEILC/Multiplane)，选择依据为 render(t) 确定性、抽帧检验、分段续渲及运动模糊控制。
