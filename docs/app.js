// 宇宙无敌表达训练系统 - Web版 (合并版)
// 合并自: expression-trainer (桌面版) + exptrain (在线版)

// ===== 语言设置 =====
function getLang() { return localStorage.getItem('expr_lang') || 'zh'; }
function setLang(lang) { localStorage.setItem('expr_lang', lang); }

// ===== 分层词库（从 tiered-lexicon.json 加载，fallback 硬编码） =====
let TIERED_LEXICON = null;
let EMOTION_LEXICON = null;

async function loadLexicons() {
  try {
    const [tieredResp, emotionResp] = await Promise.all([
      fetch('tiered-lexicon.json'),
      fetch('emotion-lexicon.json')
    ]);
    if (tieredResp.ok) TIERED_LEXICON = await tieredResp.json();
    if (emotionResp.ok) EMOTION_LEXICON = await emotionResp.json();
    console.log('[词库] 分层词库加载完成, 情绪词库加载完成');
  } catch (e) {
    console.warn('[词库] 加载失败，使用内置词表:', e.message);
  }
}

// ===== 中文词库 =====
const FILLER_WORDS_ZH = [
  '嗯', '啊', '呃', '额', '那个', '就是', '然后',
  '这个', '对吧', '是吧', '你知道', '怎么说呢',
  '反正', '基本上', '总之', '所以说', '就是说',
  '其实吧', '说实话', '对对对', '是是是', '啧', '哎', '唔'
];
const HEDGE_WORDS_ZH = [
  '可能', '也许', '大概', '应该', '我觉得', '好像',
  '似乎', '或许', '不一定', '差不多', '算是',
  '某种程度上', '一般来说', '感觉', '可能吧',
  '我不确定', '大概率', '不排除', '也有可能'
];

// 内置 VAGUE_TO_PRECISE_ZH（fallback，如果 tiered-lexicon.json 加载失败）
const VAGUE_TO_PRECISE_ZH_BUILTIN = {
  '开心': ['欣喜', '雀跃', '兴奋', '欣慰', '畅快', '满足'],
  '难过': ['心酸', '失落', '委屈', '心疼', '沮丧', '低落'],
  '害怕': ['恐惧', '焦虑', '不安', '慌张', '胆怯', '忐忑'],
  '生气': ['愤怒', '恼火', '窝火', '气愤', '不满', '暴躁'],
  '不舒服': ['压抑', '烦躁', '憋屈', '窒息', '煎熬', '疲惫'],
  '很好': ['出色', '精彩', '优秀', '惊艳', '完美', '理想'],
  '很多': ['大量', '海量', '充裕', '丰富', '密集', '可观'],
  '很快': ['迅速', '飞速', '立刻', '瞬间', '即刻', '火速'],
  '很大': ['巨大', '庞大', '显著', '惊人', '可观', '壮观'],
  '很小': ['微小', '细微', '轻微', '渺小', '微不足道', '些许'],
  '好看': ['精致', '优雅', '绚丽', '惊艳', '别致', '夺目'],
  '不好': ['糟糕', '恶劣', '拙劣', '不堪', '惨淡', '低劣'],
  '喜欢': ['热爱', '痴迷', '着迷', '钟爱', '倾心', '沉醉'],
  '讨厌': ['厌恶', '反感', '排斥', '憎恨', '鄙视', '嫌弃'],
  '觉得': ['认为', '判断', '确信', '推断', '意识到', '发现'],
  '想': ['渴望', '期待', '向往', '盼望', '企图', '打算'],
  '做': ['执行', '落实', '推进', '完成', '实施', '操作'],
  '看': ['审视', '观察', '注视', '打量', '端详', '凝视'],
  '说': ['表达', '阐述', '强调', '指出', '坦言', '声明'],
  '想想': ['反思', '回顾', '审视', '复盘', '琢磨', '斟酌']
};

// ===== 英文词库 =====
const FILLER_WORDS_EN = [
  'um', 'uh', 'ah', 'er', 'like', 'you know', 'basically',
  'actually', 'literally', 'so', 'well', 'right', 'okay so',
  'I mean', 'you see', 'kind of like', 'sort of like'
];
const HEDGE_WORDS_EN = [
  'maybe', 'perhaps', 'probably', 'I think', 'I guess',
  'kind of', 'sort of', 'a little bit', 'somewhat',
  'I suppose', 'it seems', 'more or less', 'in a way', 'arguably'
];
const VAGUE_TO_PRECISE_EN = {
  'good': ['excellent', 'outstanding', 'remarkable', 'exceptional', 'superb', 'stellar'],
  'bad': ['terrible', 'dreadful', 'appalling', 'atrocious', 'disastrous', 'abysmal'],
  'big': ['enormous', 'substantial', 'colossal', 'immense', 'massive', 'considerable'],
  'small': ['minuscule', 'negligible', 'trivial', 'microscopic', 'compact', 'modest'],
  'very': ['exceptionally', 'remarkably', 'extraordinarily', 'tremendously', 'profoundly', 'intensely'],
  'a lot': ['extensively', 'abundantly', 'substantially', 'considerably', 'tremendously', 'immensely'],
  'thing': ['aspect', 'element', 'factor', 'component', 'phenomenon', 'concept'],
  'stuff': ['material', 'content', 'resources', 'elements', 'components', 'substance'],
  'nice': ['delightful', 'pleasant', 'exquisite', 'charming', 'gracious', 'splendid'],
  'happy': ['elated', 'thrilled', 'ecstatic', 'overjoyed', 'euphoric', 'jubilant'],
  'sad': ['devastated', 'heartbroken', 'melancholy', 'sorrowful', 'despondent', 'grief-stricken'],
  'interesting': ['fascinating', 'compelling', 'captivating', 'intriguing', 'riveting', 'thought-provoking'],
  'important': ['crucial', 'vital', 'essential', 'paramount', 'significant', 'critical'],
  'hard': ['challenging', 'demanding', 'grueling', 'strenuous', 'arduous', 'formidable'],
  'easy': ['effortless', 'straightforward', 'seamless', 'intuitive', 'manageable', 'uncomplicated'],
  'fast': ['rapid', 'swift', 'lightning-fast', 'instantaneous', 'brisk', 'accelerated'],
  'slow': ['gradual', 'sluggish', 'unhurried', 'leisurely', 'plodding', 'painstaking'],
  'get': ['obtain', 'acquire', 'secure', 'achieve', 'attain', 'procure'],
  'make': ['create', 'construct', 'produce', 'generate', 'establish', 'craft'],
  'really': ['genuinely', 'truly', 'undeniably', 'absolutely', 'undoubtedly', 'fundamentally']
};

// ===== 根据语言获取词库 =====
function getFillerWords() { return getLang() === 'en' ? FILLER_WORDS_EN : FILLER_WORDS_ZH; }
function getHedgeWords() { return getLang() === 'en' ? HEDGE_WORDS_EN : HEDGE_WORDS_ZH; }

// 获取笼统词映射表（优先用分层词库，fallback 内置）
function getVagueToPrecise() {
  if (getLang() === 'en') return VAGUE_TO_PRECISE_EN;
  // 中文：优先用 tiered-lexicon.json 加载的完整词库
  if (TIERED_LEXICON) {
    const merged = {};
    const categories = ['emotions_positive', 'emotions_negative', 'states', 'vague_descriptors', 'vague_verbs', 'intensity_markers', 'social_expressions', 'evaluation_words', 'action_words'];
    categories.forEach(cat => {
      if (TIERED_LEXICON[cat]) Object.assign(merged, TIERED_LEXICON[cat]);
    });
    return merged;
  }
  return VAGUE_TO_PRECISE_ZH_BUILTIN;
}

// 获取情绪词检测表
function getEmotionDict() {
  if (getLang() === 'en') return {};
  if (EMOTION_LEXICON && EMOTION_LEXICON.emotions) return EMOTION_LEXICON.emotions;
  return {};
}

// ===== Prompt 模板 =====
function getRealtimePrompt(text, context, customPrompt) {
  const elapsed = context?.elapsedSec || 0;
  const elapsedMin = Math.floor(elapsed / 60);
  const topic = context?.topic || '';
  const prevPoints = context?.previousPoints || [];

  let customBlock = '';
  if (customPrompt) {
    if (customPrompt.goals) customBlock += `\n\n## 用户训练目标(调整你的反馈优先级)\n${customPrompt.goals}`;
    if (customPrompt.customRules) customBlock += `\n\n## 用户自定义规则(和上面的规则一起生效,触发时一样只输出1条提示)\n${customPrompt.customRules}`;
    if (customPrompt.styleRef) customBlock += `\n\n## 用户想要的表达风格(反馈时以此为标准)\n${customPrompt.styleRef}`;
    if (customPrompt.customWords) customBlock += `\n\n## 用户额外口癖词(视为填充词,出现时标记)\n${customPrompt.customWords}`;
  }

  let contextBlock = '';
  if (elapsedMin > 0) contextBlock += `[已说${elapsedMin}分钟] `;
  if (topic) contextBlock += `[开头主题: "${topic}"] `;
  if (prevPoints.length > 0) contextBlock += `[已说过的观点: ${prevPoints.join(';')}]`;

  let system;
  if (getLang() === 'en') {
    system = `你是英语口语表达的实时教练。用中文输出提示，每次只1条，不超过8个字，不加标点。

用户正在用英语演讲/表达。根据最新这段话判断是否触发规则：

## 触发规则
1. 重复检测：同一观点说过→「说过一遍」
2. 结论缺失：只有铺垫没结论→「说结论」
3. 好结构：出现自问自答(why?because...)→「✓ 好结构」
4. 缺例子：说了很久没举例→「举个例子？」
5. 前后矛盾→「跟前面矛盾」
6. 超时未入主题→「3分钟，还没进主题」
7. 金句：有力/有画面感→「⭐ 这句好」
8. 类比/故事→「✓ 有画面」
9. 太抽象没具体数字→「太抽象，给个数字」
10. 跑题→「跑题」
11. 立场模糊(it depends/not bad/whatever)→「你到底觉得呢？」

## 硬性约束
- 用中文输出提示，不超过8个字
- 不加引号、标点、编号
- 都没触发则输出空行
- 不管语音识别错误` + customBlock;
  } else {
    system = `你是中文口语表达的实时教练。每次只输出1条提示，不超过8个字，不加标点，不解释。

你的职责：根据最新这段话，判断是否触发以下任一规则。触发了输出对应提示。都没触发输出空行。

## 触发规则（按优先级排序，只输出第一个命中的）

1. 重复检测：同一个观点或句式已经说过→输出「说过一遍」
2. 结论缺失：说了一大段铺垫/背景但没给结论→输出「说结论」
3. 自问自答（正向）：出现"为什么？因为…""怎么做？就是…"这种自问自答结构→输出「✓ 好结构」
4. 听众视角：连续说了很久没举例、没画面、没故事→输出「举个例子？」
5. 前后矛盾：前面说了A后面说了相反的→输出「跟前面矛盾」
6. 时间感知：说了超过3分钟还在铺垫没进入核心→输出「3分钟，还没进主题」
7. 金句捕捉（正向）：某句话特别有力/有画面感/有金句感→输出「⭐ 这句好」
8. 类比/故事检测（正向）：出现类比、比喻、讲故事→输出「✓ 有画面」
9. 抽象→具象：连续好几个抽象概念没给具体数字或例子→输出「太抽象，给个数字」
10. 主题漂移：明显偏离了开头的主题→输出「跑题」
11. 立场模糊：出现"也挺好的""也不是不行""都可以"这种不表态→输出「你到底觉得呢？」

## 硬性约束
- 只输出提示文本本身，什么都不要多说
- 不加引号、不加标点、不加编号
- 正向反馈（3、7、8）和负向提醒混着来，不要偏向某一种
- 如果都没触发，输出一个空行
- 不管错别字、不管语音识别错误` + customBlock;
  }

  const user = `${contextBlock}\n\n最新一段：\n"${text.slice(-500)}"`;
  return { system, user };
}

function getReportPrompt(fullText, stats, customPrompt) {
  let customBlock = '';
  if (customPrompt) {
    if (customPrompt.goals) customBlock += `\n\n## 用户训练目标(报告中请重点关注这些方面)\n${customPrompt.goals}`;
    if (customPrompt.styleRef) customBlock += `\n\n## 用户想要的表达风格(评价时以此为标准)\n${customPrompt.styleRef}`;
    if (customPrompt.customWords) customBlock += `\n\n## 用户额外口癖词(请在报告中一并统计)\n${customPrompt.customWords}`;
  }

  let system;
  if (getLang() === 'en') {
    system = `你是专业英语口语表达教练。用户刚用英语说了一段话，你需要用中文写一份详细的分析报告。

报告开头第一句话固定为：「宇宙无敌少女收到你的英语录音啦~~」

请严格按以下结构输出(markdown格式):

## 总评
给一个总分(0-100)和一句话定位。

## ✓ 亮点
引用英文原文中说得好的部分，用中文解释为什么好。

## 🔧 逐句编辑
对每句有问题的英文，给出:
> 原文: "xxx"
> 建议: "xxx"
> 原因(中文): xxx

包括: 语法错误、用词不精准、句式单一、表达不地道、逻辑不清晰。

## 📝 用词精准度

| 原词 | 可替换为 |
|------|--------|
| good | excellent / outstanding / remarkable |
| very | incredibly / remarkably / profoundly |

只列出笼统/重复/低级的英文词，给出更高级的替代。

## 💬 行为模式分析

**填充词模式**: um/uh/like/you know等出现频率和情境。
**犹豫模式**: maybe/I think/kind of等hedging词的使用情况。
**直接性**: 哪些地方可以更直接，对比原文vs直接版。
**语法准确度**: 时态、主谓一致、冠词、介词等常见问题。
**发音提示**: 根据语音识别结果推测可能的发音问题。

## 📊 数据

| 指标 | 数值 |
|------|------|
| 时长 | Xs |
| 总词数 | X |
| 语速 | X词/分钟 |
| 填充词频率 | X次/分钟 |
| 犹豫词占比 | X% |

## 🎯 下次练习重点
只给1条最关键的改进方向 + 具体怎么练。

---
语气要求:用中文写，直接、犀利、有建设性。像一个严格但真心关心你的英语教练。` + customBlock;
  } else {
    system = `你是专业中文表达教练,融合了两套核心能力:

**能力一：沟通行为分析 (meeting-insights-analyzer)**
——识别行为模式、冲突回避、填充词习惯、说话比例、主导性vs被动性、倒退语言(hedging)模式、间接表达习惯。具体分析维度:
- 冲突回避: 是否用hedging回避表态("也不是不行""也挺好的")、是否在该直接表态时绕弯子、是否改变话题回避紧张
- 填充词模式: 哪些词、频率、在什么情境下爆发(紧张/思考/过渡/不确定)
- 直接性: 多少句子用了委婉/间接表达、对比原文vs直接版
- 主导性: 是否有明确立场和判断,还是一直在"描述"而不"下结论"

**能力二：内容编辑与研究 (content-research-writer)**
——逐句行编辑(原文→建议→为什么)、钩子优化、结构流畅度、论据充分性、保留个人风格、精确用词替换。具体编辑维度:
- 清晰度(clarity): 复杂句→简化, 模糊表达→精确陈述
- 流畅度(flow): 过渡是否自然, 段落顺序是否合理
- 论据(evidence): 哪些说法缺例子/数据支撑
- 风格(style): 语气不一致、用词可以更强
- 钩子(hook): 开头是否制造了好奇心、是否承诺了价值
- 收尾(closing): 结尾是否给了可操作的行动(call to action)

请严格按以下结构输出报告(用markdown格式):

报告开头第一句话固定为：「宇宙无敌少女收到你的录音啦~~」（如果输入是逐字稿则改为「宇宙无敌少女收到你的逐字稿啦~~」），然后空一行再开始正文。

## 总评

给一个总分(0-100)和一句话定位,描述这段表达的整体特点和核心问题。

## ✓ 亮点

逐句标出说得好的部分(引用原文),说明为什么好:
- 画面感强?逻辑清晰?比喻精准?有力量感?钩子有效?
- 每个亮点引用原文 + 一句话点评

## 🔧 逐句编辑

对每句有问题的话,用以下格式:

> 原文:"XXXX"
>
> 建议:"XXXX"
>
> 原因:XXX

逐句给出,不要跳过。编辑维度包括:
- **清晰度**(clarity): 复杂句→简化, 模糊表达→精确陈述
- **流畅度**(flow): 过渡是否自然, 段落顺序是否合理
- **论据**(evidence): 哪些说法缺例子/数据支撑
- **风格**(style): 语气不一致、用词可以更强
- **钩子**(hook): 开头是否制造了好奇心、是否承诺了价值

## 📝 用词精准度(情感词库替换表)

**只替换情感词库中的词,不纠正语法、不纠正句式、不纠正连接词。**

只关注以下三类词:
1. **情绪词**: 笼统的情绪表达→更细腻的情感词
2. **程度词**: 很/非常/特别→更有画面感的程度描述
3. **描述词**: 笼统的形容词→更具体的表达

格式:

| 原词 | 可替换为 |
|------|---------|
| 开心 | 振奋 / 得意 / 雀跃 |
| 不太好 | 窝火 / 失落 / 无力 |
| 很多 | 堆满了 / 排了三列 |
| 厉害 | 强大 / 高效 / 精妙 |

要求:
- **不要列连接词**(然后/就是/那个等不用管)
- **不要列填充词**(对/嗯/吧/嘛等不用管)
- **不要纠正语法**(句式啰嗦不用管)
- 只列出说话者实际用到的情绪/程度/描述词,给出更细腻的替代

## 💬 行为模式分析

深入分析说话者的沟通行为模式:

**填充词模式**:
- 具体哪些词,各出现几次
- 频率(X次/分钟)
- 在什么情况下出现多(紧张?思考?过渡?不确定?)

**冲突回避 / 间接表达**:
- 哪些地方本可以直接表态但绕了弯子
- 是否用了hedging来回避立场("也不是不行""也挺好的")
- 给出更直接的替代表达

**犹豫模式**:
- 在什么类型的内容前会犹豫
- 是习惯性的还是特定话题触发的
- 引用具体例子并给出更自信的表达方式

**直接性评分**:
- X%的句子用了委婉/间接表达
- 举例说明哪些地方绕了弯子
- 对比"原文" vs "直接版"

**说服力与结构**:
- 开头是否有有效的钩子(hook)
- 核心观点是否明确、是否有人会不同意(锋利度)
- 是否有具体例子/故事支撑观点
- 结尾是否给了可操作的行动(call to action)

## 📊 数据

| 指标 | 数值 |
|------|------|
| 时长 | X秒 |
| 总字数 | X |
| 语速 | X字/分钟 |
| 表达密度 | X% |
| 填充词频率 | X次/分钟 |
| 犹豫词占比 | X% |
| 直接性评分 | X% |

## 🎯 下次练习重点

只给1条最关键的改进方向 + 具体怎么练(可操作的方法,不是空话)。

---

语气要求:直接、犀利、有建设性。像一个严格但真心关心你的教练。不要客套、不要废话。` + customBlock;
  }

  const user = `以下是说话者的完整口语内容:

---
${fullText}
---

数据:${stats.duration}秒 | ${stats.totalWords}字 | 填充词${stats.fillers}次 | 犹豫词${stats.hedges}次 | 笼统词${stats.vagueWords}次`;

  return { system, user };
}

// ===== AI API调用 =====
const PROVIDER_DEFAULTS = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
  custom: { baseUrl: '', model: 'deepseek-chat' }
};

function getProviderConfig(settings) {
  const { provider, apiKey, model, baseUrl } = settings;
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.deepseek;
  const finalBaseUrl = (baseUrl || defaults.baseUrl).replace(/\/+$/, '');
  const endpoint = finalBaseUrl + '/chat/completions';
  return { endpoint, apiKey, model: model || defaults.model };
}

async function callAI(messages, maxTokens = 200) {
  const settings = loadSettings();
  if (!settings.apiKey && settings.provider !== 'ollama') return null;

  const config = getProviderConfig(settings);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (settings.provider !== 'ollama' || config.apiKey !== 'ollama') {
      headers['Authorization'] = `Bearer ${config.apiKey || 'ollama'}`;
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API ${response.status}: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error('[AI] Error:', err);
    return null;
  }
}

// ===== 文本分析（本地词库） =====
function analyzeText(text) {
  if (!text || !text.trim()) return null;

  const lang = getLang();
  const fillerList = getFillerWords();
  const hedgeList = getHedgeWords();
  const vagueMap = getVagueToPrecise();
  const emotionDict = getEmotionDict();

  const words = segmentText(text);
  const totalWords = words.length;

  const fillers = [];
  const hedges = [];
  const vagueWords = [];
  const emotionWords = [];

  if (lang === 'en') {
    const textLower = text.toLowerCase();
    fillerList.forEach(f => {
      const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
      let match;
      while ((match = regex.exec(textLower)) !== null) {
        fillers.push({ word: f.toLowerCase(), position: match.index });
      }
    });

    hedgeList.forEach(h => {
      const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
      let match;
      while ((match = regex.exec(textLower)) !== null) {
        hedges.push({ word: h.toLowerCase(), position: match.index });
      }
    });

    words.forEach((word, idx) => {
      const w = word.toLowerCase();
      const key = Object.keys(vagueMap).find(k => k.toLowerCase() === w);
      if (key) vagueWords.push({ word, position: idx, alternatives: vagueMap[key] });
    });
  } else {
    words.forEach((word, idx) => {
      if (fillerList.some(f => f === word)) fillers.push({ word, position: idx });
    });
    words.forEach((word, idx) => {
      if (hedgeList.some(h => h === word)) hedges.push({ word, position: idx });
    });
    words.forEach((word, idx) => {
      const key = Object.keys(vagueMap).find(k => k === word);
      if (key) vagueWords.push({ word, position: idx, alternatives: vagueMap[key] });
    });
    // 情绪词检测
    if (emotionDict && Object.keys(emotionDict).length > 0) {
      words.forEach((word, idx) => {
        if (emotionDict[word]) {
          emotionWords.push({ word, position: idx, ...emotionDict[word] });
        }
      });
    }
  }

  const meaningfulWords = totalWords - fillers.length - hedges.length;
  const density = totalWords > 0 ? (meaningfulWords / totalWords) : 1;

  return {
    totalWords, fillers, hedges, vagueWords, emotionWords,
    density: Math.round(density * 100),
    suggestions: generateSuggestions(vagueWords, fillers, hedges)
  };
}

// 生成结构化建议（与桌面版 lexicon.js 一致）
function generateSuggestions(vagueWords, fillers, hedges) {
  const suggestions = [];
  vagueWords.forEach(item => {
    suggestions.push({
      type: 'vague',
      original: item.word,
      alternatives: item.alternatives.slice(0, 3),
      message: `「${item.word}」→ 试试更精准的：${item.alternatives.slice(0, 3).join('、')}`
    });
  });
  if (fillers.length >= 3) {
    const topFillers = [...new Set(fillers.map(f => f.word))].slice(0, 3);
    suggestions.push({
      type: 'filler',
      message: `填充词偏多（${fillers.length}次）：${topFillers.join('、')}。试试用停顿替代`
    });
  }
  if (hedges.length >= 2) {
    suggestions.push({
      type: 'hedge',
      message: `犹豫表达较多（${hedges.length}次）。试试把「我觉得」改成直接陈述`
    });
  }
  return suggestions;
}

function segmentText(text) {
  if (getLang() === 'en') {
    return text.split(/\s+/).filter(w => w.length > 0);
  }
  const words = [];
  let i = 0;
  const maxLen = 6;
  const fillerList = getFillerWords();
  const hedgeList = getHedgeWords();
  const vagueMap = getVagueToPrecise();
  const emotionDict = getEmotionDict();
  const dict = new Set([...fillerList, ...hedgeList, ...Object.keys(vagueMap), ...Object.keys(emotionDict)]);

  while (i < text.length) {
    let matched = false;
    for (let len = Math.min(maxLen, text.length - i); len >= 2; len--) {
      const word = text.substring(i, i + len);
      if (dict.has(word)) {
        words.push(word);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      words.push(text[i]);
      i++;
    }
  }
  return words;
}

// ===== 设置管理（各厂商独立保存） =====
function getActiveProvider() {
  return localStorage.getItem('expr_active_provider') || 'deepseek';
}

function setActiveProvider(provider) {
  localStorage.setItem('expr_active_provider', provider);
}

function loadProviderSettings(provider) {
  const raw = localStorage.getItem('expr_settings_' + provider);
  if (raw) return JSON.parse(raw);
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.deepseek;
  return { apiKey: '', model: '', baseUrl: defaults.baseUrl };
}

function saveProviderSettings(provider, settings) {
  localStorage.setItem('expr_settings_' + provider, JSON.stringify(settings));
}

function loadSettings() {
  // 兼容旧版单一配置迁移
  const legacy = localStorage.getItem('expr_settings');
  if (legacy) {
    try {
      const old = JSON.parse(legacy);
      const provider = old.provider || 'deepseek';
      const migrated = { apiKey: old.apiKey || '', model: old.model || '', baseUrl: old.customEndpoint ? old.customEndpoint.replace(/\/chat\/completions\/?$/, '') : (PROVIDER_DEFAULTS[provider]?.baseUrl || '') };
      saveProviderSettings(provider, migrated);
      setActiveProvider(provider);
      localStorage.removeItem('expr_settings');
      return { provider, ...migrated };
    } catch(e) { localStorage.removeItem('expr_settings'); }
  }
  const provider = getActiveProvider();
  const providerSettings = loadProviderSettings(provider);
  return { provider, ...providerSettings };
}

function saveSettings(settings) {
  const { provider, apiKey, model, baseUrl } = settings;
  setActiveProvider(provider);
  saveProviderSettings(provider, { apiKey, model, baseUrl });
}

function loadCustomPrompt() {
  const raw = localStorage.getItem('expr_prompt');
  if (raw) return JSON.parse(raw);
  return { goals: '', customRules: '', styleRef: '', customWords: '' };
}

function saveCustomPrompt(prompt) {
  localStorage.setItem('expr_prompt', JSON.stringify(prompt));
}

// ===== 报告历史 CRUD（localStorage 持久化） =====
function generateReportId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const rand = Math.random().toString(36).slice(2, 6);
  return `report-${date}-${time}-${rand}`;
}

function loadReports() {
  try {
    const raw = localStorage.getItem('expr_reports');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) { return []; }
}

function saveReports(reports) {
  localStorage.setItem('expr_reports', JSON.stringify(reports));
}

function saveReport(report) {
  const reports = loadReports();
  // 插入到最前面
  reports.unshift(report);
  // 最多保留 50 条
  if (reports.length > 50) reports.length = 50;
  saveReports(reports);
}

function updateReport(id, updates) {
  const reports = loadReports();
  const idx = reports.findIndex(r => r.id === id);
  if (idx >= 0) {
    Object.assign(reports[idx], updates);
    saveReports(reports);
  }
}

function deleteReport(id) {
  const reports = loadReports();
  const filtered = reports.filter(r => r.id !== id);
  saveReports(filtered);
}

// ===== 主应用 =====
class ExpressionTrainer {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.pauseStart = null;
    this.timerInterval = null;
    this.fullText = '';
    this.sentences = [];
    this.stats = { fillers: 0, hedges: 0, vagueWords: 0, totalWords: 0, duration: 0 };
    this.wordCounts = {};
    this.lastFeedbackText = '';
    this.lastReport = '';
    this.currentReportId = null;
    this.recognition = null;

    this.initElements();
    this.bindEvents();
    this.showWelcome();
    loadLexicons(); // 异步加载分层词库和情绪词库
  }

  initElements() {
    this.btnStart = document.getElementById('btn-start');
    this.btnPaste = document.getElementById('btn-paste');
    this.btnPause = document.getElementById('btn-pause');
    this.btnResume = document.getElementById('btn-resume');
    this.btnStop = document.getElementById('btn-stop');
    this.btnReport = document.getElementById('btn-report');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnLangToggle = document.getElementById('btn-lang-toggle');
    this.btnPromptEditor = document.getElementById('btn-prompt-editor');
    this.btnCopyText = document.getElementById('btn-copy-text');
    this.btnSaveText = document.getElementById('btn-save-text');
    this.btnClear = document.getElementById('btn-clear');
    this.timer = document.getElementById('timer');
    this.subtitleScroll = document.getElementById('subtitle-scroll');
    this.subtitleContainer = document.getElementById('subtitle-container');
    this.feedbackContent = document.getElementById('feedback-content');

    // Modals
    this.welcomeModal = document.getElementById('welcome-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.promptModal = document.getElementById('prompt-modal');
    this.pasteModal = document.getElementById('paste-modal');
    this.reportModal = document.getElementById('report-modal');
    this.reportBody = document.getElementById('report-body');
    this.coffeeModal = document.getElementById('coffee-modal');

    // History
    this.btnHistory = document.getElementById('btn-history');
    this.historyModal = document.getElementById('history-modal');
    this.historyList = document.getElementById('history-list');
    this.historyDetail = document.getElementById('history-detail');

    // Stats
    this.statFillers = document.getElementById('stat-fillers');
    this.statHedges = document.getElementById('stat-hedges');
    this.statVague = document.getElementById('stat-vague');
    this.statDensity = document.getElementById('stat-density');

    if (this.btnLangToggle) this.btnLangToggle.textContent = getLang().toUpperCase();
  }

  bindEvents() {
    // Recording controls
    this.btnStart.addEventListener('click', () => this.startRecording());
    this.btnPause.addEventListener('click', () => this.pauseRecording());
    this.btnResume.addEventListener('click', () => this.resumeRecording());
    this.btnStop.addEventListener('click', () => this.stopRecording());
    this.btnReport.addEventListener('click', () => this.generateReport());

    // Topbar
    this.btnSettings.addEventListener('click', () => this.openSettings());
    this.btnLangToggle.addEventListener('click', () => this.toggleLang());
    this.btnPromptEditor.addEventListener('click', () => this.openPromptEditor());

    // Subtitle toolbar
    this.btnPaste.addEventListener('click', () => this.openPasteModal());
    this.btnCopyText.addEventListener('click', () => this.copyOriginalText());
    this.btnSaveText.addEventListener('click', () => this.saveOriginalText());
    this.btnClear.addEventListener('click', () => this.clearAll());

    // Settings modal
    document.getElementById('btn-close-settings').addEventListener('click', () => this.settingsModal.classList.add('hidden'));
    document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettingsForm());
    document.getElementById('btn-test-settings').addEventListener('click', () => this.testConnectivity());
    document.getElementById('settings-provider').addEventListener('change', (e) => {
      this.onProviderChange(e.target.value);
    });

    // Prompt modal
    document.getElementById('btn-close-prompt').addEventListener('click', () => this.promptModal.classList.add('hidden'));
    document.getElementById('btn-save-prompt').addEventListener('click', () => this.savePromptForm());

    // Paste modal
    document.getElementById('btn-close-paste').addEventListener('click', () => this.pasteModal.classList.add('hidden'));
    document.getElementById('btn-analyze-paste').addEventListener('click', () => this.analyzePastedText());

    // Report modal
    document.getElementById('btn-close-report').addEventListener('click', () => this.reportModal.classList.add('hidden'));
    document.getElementById('btn-copy-report').addEventListener('click', () => this.copyReport());
    document.getElementById('btn-download-report-header').addEventListener('click', () => this.downloadReport());

    // Welcome
    document.getElementById('btn-welcome-start').addEventListener('click', () => {
      this.welcomeModal.classList.add('hidden');
      localStorage.setItem('expr_welcomed', '1');
      const settings = loadSettings();
      if (!settings.apiKey) {
        setTimeout(() => this.openSettings(true), 300);
      }
    });

    // Social toggle
    document.getElementById('social-toggle').addEventListener('click', () => {
      document.getElementById('social-panel').classList.toggle('hidden');
    });

    // Coffee
    document.getElementById('btn-coffee').addEventListener('click', (e) => { e.preventDefault(); this.coffeeModal.classList.remove('hidden'); });
    document.getElementById('btn-close-coffee').addEventListener('click', () => this.coffeeModal.classList.add('hidden'));

    // History
    this.btnHistory.addEventListener('click', () => this.showReportHistory());
    document.getElementById('btn-close-history').addEventListener('click', () => this.historyModal.classList.add('hidden'));

    // Mobile tabs
    document.querySelectorAll('.mobile-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchMobilePanel(tab.dataset.panel));
    });
  }

  // ===== Welcome =====
  showWelcome() {
    if (!localStorage.getItem('expr_welcomed')) {
      this.welcomeModal.classList.remove('hidden');
    }
  }

  // ===== Mobile panel switching =====
  switchMobilePanel(panel) {
    document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.mobile-tab[data-panel="${panel}"]`).classList.add('active');

    const panelLeft = document.getElementById('panel-left');
    const panelRight = document.getElementById('panel-right');
    const mainArea = document.querySelector('.main-area');

    panelLeft.classList.remove('mobile-active');
    panelRight.classList.remove('mobile-active');
    mainArea.classList.remove('mobile-hidden');

    if (panel === 'left') {
      panelLeft.classList.add('mobile-active');
      mainArea.classList.add('mobile-hidden');
    } else if (panel === 'right') {
      panelRight.classList.add('mobile-active');
      mainArea.classList.add('mobile-hidden');
    }
  }

  // ===== Settings =====
  toggleLang() {
    const current = getLang();
    const next = current === 'zh' ? 'en' : 'zh';
    setLang(next);
    this.btnLangToggle.textContent = next.toUpperCase();
    const msg = next === 'en' ? 'Switched to English mode' : '已切换为中文模式';
    this.addFeedbackItem(msg, 'ai');
  }

  openSettings(showWarning = false) {
    const settings = loadSettings();
    const providerSelect = document.getElementById('settings-provider');
    providerSelect.value = settings.provider || 'deepseek';
    document.getElementById('settings-apikey').value = settings.apiKey || '';
    document.getElementById('settings-model').value = settings.model || '';
    const defaults = PROVIDER_DEFAULTS[settings.provider] || PROVIDER_DEFAULTS.deepseek;
    document.getElementById('settings-baseurl').value = settings.baseUrl || defaults.baseUrl || '';
    document.getElementById('settings-model').placeholder = defaults.model;
    document.getElementById('settings-baseurl').placeholder = defaults.baseUrl || 'https://api.example.com/v1';

    // Ollama doesn't need API key
    if (settings.provider === 'ollama') {
      document.getElementById('settings-apikey').parentElement.style.opacity = '0.4';
    } else {
      document.getElementById('settings-apikey').parentElement.style.opacity = '1';
    }

    document.getElementById('settings-baseurl-group').classList.remove('hidden');
    document.getElementById('settings-warning').classList.toggle('hidden', !showWarning);
    const testResult = document.getElementById('settings-test-result');
    testResult.classList.add('hidden');
    testResult.className = 'settings-test-result hidden';
    this.settingsModal.classList.remove('hidden');
  }

  onProviderChange(provider) {
    const providerSettings = loadProviderSettings(provider);
    const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.deepseek;
    document.getElementById('settings-apikey').value = providerSettings.apiKey || '';
    document.getElementById('settings-model').value = providerSettings.model || '';
    document.getElementById('settings-baseurl').value = providerSettings.baseUrl || defaults.baseUrl || '';
    document.getElementById('settings-model').placeholder = defaults.model;
    document.getElementById('settings-baseurl').placeholder = defaults.baseUrl || 'https://api.example.com/v1';

    if (provider === 'ollama') {
      document.getElementById('settings-apikey').parentElement.style.opacity = '0.4';
    } else {
      document.getElementById('settings-apikey').parentElement.style.opacity = '1';
    }

    const testResult = document.getElementById('settings-test-result');
    testResult.classList.add('hidden');
  }

  getSettingsFormValues() {
    return {
      provider: document.getElementById('settings-provider').value,
      apiKey: document.getElementById('settings-apikey').value.trim(),
      model: document.getElementById('settings-model').value.trim(),
      baseUrl: document.getElementById('settings-baseurl').value.trim()
    };
  }

  async testConnectivity() {
    const settings = this.getSettingsFormValues();
    const testResult = document.getElementById('settings-test-result');

    if (settings.provider !== 'ollama' && !settings.apiKey) {
      testResult.className = 'settings-test-result error';
      testResult.textContent = '请先填写 API Key';
      testResult.classList.remove('hidden');
      return false;
    }
    if (settings.provider === 'custom' && !settings.baseUrl) {
      testResult.className = 'settings-test-result error';
      testResult.textContent = '自定义服务商请填写 Base URL';
      testResult.classList.remove('hidden');
      return false;
    }

    testResult.className = 'settings-test-result loading';
    testResult.textContent = '正在测试连接...';
    testResult.classList.remove('hidden');

    const config = getProviderConfig(settings);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (settings.provider !== 'ollama' || config.apiKey !== 'ollama') {
        headers['Authorization'] = `Bearer ${config.apiKey || 'ollama'}`;
      }
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1
        })
      });

      if (response.ok) {
        testResult.className = 'settings-test-result success';
        testResult.textContent = `连接成功！模型: ${config.model}`;
        return true;
      } else {
        const errorText = await response.text().catch(() => '');
        let hint = '';
        if (response.status === 401) hint = 'API Key 无效或已过期';
        else if (response.status === 404) hint = 'Base URL 或模型名称有误';
        else if (response.status === 429) hint = '请求频率超限，请稍后再试';
        else hint = `HTTP ${response.status}`;
        testResult.className = 'settings-test-result error';
        testResult.textContent = `连接失败: ${hint}`;
        return false;
      }
    } catch (err) {
      testResult.className = 'settings-test-result error';
      testResult.textContent = `网络错误: ${err.message || '无法连接服务器'}`;
      return false;
    }
  }

  async saveSettingsForm() {
    const success = await this.testConnectivity();
    if (!success) return;
    const settings = this.getSettingsFormValues();
    saveSettings(settings);
    this.settingsModal.classList.add('hidden');
    this.addFeedbackItem('大模型配置已保存', 'good');
  }

  // ===== Prompt Editor =====
  openPromptEditor() {
    const prompt = loadCustomPrompt();
    document.getElementById('prompt-goals').value = prompt.goals || '';
    document.getElementById('prompt-rules').value = prompt.customRules || '';
    document.getElementById('prompt-style').value = prompt.styleRef || '';
    document.getElementById('prompt-words').value = prompt.customWords || '';
    this.promptModal.classList.remove('hidden');
  }

  savePromptForm() {
    const prompt = {
      goals: document.getElementById('prompt-goals').value.trim(),
      customRules: document.getElementById('prompt-rules').value.trim(),
      styleRef: document.getElementById('prompt-style').value.trim(),
      customWords: document.getElementById('prompt-words').value.trim()
    };
    saveCustomPrompt(prompt);
    this.promptModal.classList.add('hidden');
  }

  // ===== 录制控制 (Web Speech API) =====
  startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showError('浏览器不支持语音识别，请使用Chrome/Edge/Safari');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = getLang() === 'en' ? 'en-US' : 'zh-CN';
    // Chrome 上 continuous: true 有 bug 会频繁 abort，改用单次识别 + onend 重启
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this._restartRetries = 0;
    this._lastRestartTime = 0;

    this.recognition.onresult = (event) => {
      if (this.isPaused) return;
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.handleASRResult({ text: finalTranscript, isFinal: true });
      }
      if (interimTranscript) {
        this.handleASRResult({ text: interimTranscript, isFinal: false });
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[ASR] Error:', event.error, event.message);
      if (event.error === 'no-speech') {
        // 没说话，不报错，让 onend 继续重启
        return;
      }
      if (event.error === 'aborted') {
        // 被中断，正常情况（页面切换/手动 stop）
        return;
      }
      if (event.error === 'not-allowed') {
        this.showError('麦克风权限被拒绝，请在浏览器设置中允许');
        this.stopRecording();
        return;
      }
      if (event.error === 'network') {
        this.showError('语音识别网络错误（需要HTTPS或localhost）');
        this.stopRecording();
        return;
      }
      // 其他错误也显示
      this.showError(`语音识别错误: ${event.error}`);
    };

    this.recognition.onend = () => {
      if (!this.isRecording || this.isPaused) return;

      // Chrome 对 continuous=false 会在一段话结束后自动触发 onend
      // 需要手动重启，但加防抖避免频繁重启
      const now = Date.now();
      if (now - this._lastRestartTime < 300) {
        // 太频繁，延迟一下
        this._restartRetries++;
        if (this._restartRetries > 5) {
          console.warn('[ASR] 重启太频繁，暂停识别');
          this.showError('语音识别异常中断，请重新点击开始');
          this.stopRecording();
          return;
        }
        setTimeout(() => {
          if (this.isRecording && !this.isPaused) {
            this._restartRecognition();
          }
        }, 500);
        return;
      }

      this._restartRetries = 0;
      this._lastRestartTime = now;
      this._restartRecognition();
    };

    try {
      this.recognition.start();
    } catch (err) {
      this.showError(`语音识别启动失败: ${err.message}`);
      return;
    }

    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.fullText = '';
    this.sentences = [];
    this.resetStats();
    this.subtitleContainer.innerHTML = '<div class="subtitle-line interim-line" style="color:#E5007E;">🎤 正在听你说话...</div>';

    this.btnStart.classList.add('hidden');
    this.btnPause.classList.remove('hidden');
    this.btnStop.classList.remove('hidden');
    this.btnReport.classList.add('hidden');
    this.btnResume.classList.add('hidden');
    this.btnCopyText.classList.add('hidden');
    this.btnSaveText.classList.add('hidden');
    this.btnClear.classList.add('hidden');
    this.timer.classList.add('active');

    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  // 静默重启识别（用于 continuous=false 的 onend 回调）
  _restartRecognition() {
    if (!this.recognition || !this.isRecording || this.isPaused) return;
    try {
      this.recognition.start();
      this._restartRetries = 0;
    } catch (e) {
      console.warn('[ASR] 重启失败:', e.message);
      // 可能还在处理上一次，延迟重试
      setTimeout(() => {
        if (this.isRecording && !this.isPaused) {
          try { this.recognition.start(); } catch (e2) { /* ignore */ }
        }
      }, 300);
    }
  }

  pauseRecording() {
    this.isPaused = true;
    this.pauseStart = Date.now();
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) { /* ignore */ }
    }
    this.btnPause.classList.add('hidden');
    this.btnResume.classList.remove('hidden');
    this.timer.classList.remove('active');
  }

  resumeRecording() {
    this.isPaused = false;
    this.pausedTime += Date.now() - this.pauseStart;
    this.pauseStart = null;
    this._restartRecognition();
    this.btnResume.classList.add('hidden');
    this.btnPause.classList.remove('hidden');
    this.timer.classList.add('active');
  }

  stopRecording() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) { /* ignore */ }
      this.recognition = null;
    }
    this.isRecording = false;
    this.isPaused = false;

    clearInterval(this.timerInterval);
    let totalPaused = this.pausedTime;
    if (this.pauseStart) totalPaused += Date.now() - this.pauseStart;
    this.stats.duration = Math.floor((Date.now() - this.startTime - totalPaused) / 1000);

    this.btnStop.classList.add('hidden');
    this.btnPause.classList.add('hidden');
    this.btnResume.classList.add('hidden');
    this.btnStart.classList.remove('hidden');
    this.timer.classList.remove('active');

    if (this.fullText.trim()) {
      this.btnReport.classList.remove('hidden');
      this.btnCopyText.classList.remove('hidden');
      this.btnSaveText.classList.remove('hidden');
      this.btnClear.classList.remove('hidden');
    }
  }

  // ===== ASR结果处理 =====
  handleASRResult({ text, isFinal }) {
    if (isFinal) {
      this.sentences.push(text);
      this.fullText += text;
      this.analyzeCurrentSentence(text);

      if (this.fullText.length - this.lastFeedbackText.length >= 30) {
        this.requestRealtimeFeedback();
      }
    }
    this.renderSubtitle(text, isFinal);
  }

  renderSubtitle(currentText, isFinal) {
    if (isFinal) {
      const interim = this.subtitleContainer.querySelector('.interim-line');
      if (interim) interim.remove();

      this.subtitleContainer.querySelectorAll('.subtitle-line:not(.old)').forEach(el => {
        el.classList.add('old');
      });

      const line = document.createElement('div');
      line.className = 'subtitle-line';
      line.innerHTML = this.highlightText(currentText);
      this.subtitleContainer.appendChild(line);
    } else {
      let interim = this.subtitleContainer.querySelector('.interim-line');
      if (!interim) {
        interim = document.createElement('div');
        interim.className = 'subtitle-line interim-line';
        this.subtitleContainer.appendChild(interim);
      }
      interim.textContent = currentText;
    }

    this.subtitleScroll.scrollTop = this.subtitleScroll.scrollHeight;
  }

  highlightText(text) {
    let result = text;
    const isEn = getLang() === 'en';
    const fillers = getFillerWords();
    const hedges = getHedgeWords();
    const vagueMap = getVagueToPrecise();
    const vagueKeys = Object.keys(vagueMap);

    function makePattern(wordList, flags) {
      const sorted = [...wordList].sort((a, b) => b.length - a.length);
      const escaped = sorted.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (isEn) {
        return new RegExp('\\b(' + escaped.join('|') + ')\\b', flags);
      }
      return new RegExp('(' + escaped.join('|') + ')', flags);
    }

    const vaguePattern = makePattern(vagueKeys, isEn ? 'gi' : 'g');
    result = result.replace(vaguePattern, '<span class="vague">$1</span>');
    const fillerPattern = makePattern(fillers, isEn ? 'gi' : 'g');
    result = result.replace(fillerPattern, '<span class="filler">$1</span>');
    const hedgePattern = makePattern(hedges, isEn ? 'gi' : 'g');
    result = result.replace(hedgePattern, '<span class="hedge">$1</span>');
    return result;
  }

  // ===== 分析 =====
  analyzeCurrentSentence(text) {
    const analysis = analyzeText(text);
    if (analysis) {
      this.stats.fillers += analysis.fillers.length;
      this.stats.hedges += analysis.hedges.length;
      this.stats.vagueWords += analysis.vagueWords.length;
      this.stats.totalWords += analysis.totalWords;
      this.updateStatsDisplay();

      analysis.fillers.forEach(f => {
        const key = 'filler:' + (f.word || '').toLowerCase();
        this.wordCounts[key] = (this.wordCounts[key] || 0) + 1;
      });
      analysis.hedges.forEach(h => {
        const key = 'hedge:' + (h.word || '').toLowerCase();
        this.wordCounts[key] = (this.wordCounts[key] || 0) + 1;
      });

      // 笼统词不设阈值，出现就提示替换
      if (analysis.vagueWords.length > 0) {
        analysis.vagueWords.forEach(item => {
          const alts = item.alternatives.slice(0, 3).join(' / ');
          this.addFeedbackItem(`「${item.word}」→ ${alts}`, 'vague');
        });
      }

      // 填充词提醒：只有累计出现≥2次的词才提醒
      const repeatFillers = analysis.fillers
        .map(f => f.word.toLowerCase())
        .filter(w => this.wordCounts['filler:' + w] >= 2);
      if (repeatFillers.length > 0) {
        const unique = [...new Set(repeatFillers)].slice(0, 3);
        const lang = getLang();
        if (lang === 'en') {
          this.addFeedbackItem(`Filler: ${unique.join(', ')} — try pausing`, 'filler');
        } else {
          this.addFeedbackItem(`填充词：${unique.join('、')}——试试停顿`, 'filler');
        }
      }

      // 犹豫词提醒：只有累计出现≥2次的词才提醒
      const repeatHedges = analysis.hedges
        .map(h => h.word.toLowerCase())
        .filter(w => this.wordCounts['hedge:' + w] >= 2);
      if (repeatHedges.length > 0) {
        const unique = [...new Set(repeatHedges)].slice(0, 2);
        const lang = getLang();
        if (lang === 'en') {
          this.addFeedbackItem(`Hedging: ${unique.join(', ')} — be direct`, 'hedge');
        } else {
          this.addFeedbackItem(`「${unique.join('」「')}」→ 直接说`, 'hedge');
        }
      }
    }
  }

  updateStatsDisplay() {
    this.statFillers.textContent = this.stats.fillers;
    this.statHedges.textContent = this.stats.hedges;
    this.statVague.textContent = this.stats.vagueWords;
    if (this.stats.totalWords > 0) {
      const density = ((this.stats.totalWords - this.stats.fillers - this.stats.hedges) / this.stats.totalWords * 100).toFixed(0);
      this.statDensity.textContent = density + '%';
    }
  }

  // ===== 实时AI反馈 =====
  async requestRealtimeFeedback() {
    this.lastFeedbackText = this.fullText;
    const customPrompt = loadCustomPrompt();
    const elapsed = this.stats.duration || Math.floor((Date.now() - (this.startTime || Date.now())) / 1000);
    const prompt = getRealtimePrompt(this.fullText, { elapsedSec: elapsed }, customPrompt);

    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];

    const result = await callAI(messages, 150);
    if (result) {
      const lines = result.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const type = this.classifyFeedback(line.trim());
        this.addFeedbackItem(line.trim(), type);
      });
    }
  }

  classifyFeedback(text) {
    if (text === '✓' || text.includes('✓')) return 'good';
    if (text.includes('⭐')) return 'good';
    const fillerKeywords = ['嗯', '啊', '呃', '那个', '就是', '然后', '这个', '对吧', '是吧', '反正', '基本上', '所以说'];
    if (fillerKeywords.some(w => text.includes(`「${w}」`))) return 'filler';
    const hedgeKeywords = ['可能', '也许', '大概', '应该', '我觉得', '好像', '似乎', '感觉', '或许'];
    if (hedgeKeywords.some(w => text.includes(`「${w}」`))) return 'hedge';
    if (text.includes('→')) return 'vague';
    return 'ai';
  }

  addFeedbackItem(text, type = 'ai') {
    const existing = Array.from(this.feedbackContent.children).slice(0, 3);
    if (existing.some(el => el.textContent === text)) return;

    const item = document.createElement('div');
    item.className = `feedback-item type-${type}`;
    item.textContent = text;
    this.feedbackContent.insertBefore(item, this.feedbackContent.firstChild);
    while (this.feedbackContent.children.length > 12) {
      this.feedbackContent.removeChild(this.feedbackContent.lastChild);
    }
  }

  // ===== 报告 =====
  // ===== 异步报告生成（后台生成 + 历史保存） =====
  async generateReport() {
    const reportId = generateReportId();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // 先保存一条"生成中"的记录
    const reportEntry = {
      id: reportId,
      date: dateStr,
      textPreview: this.fullText.slice(0, 80),
      stats: { ...this.stats },
      status: 'generating',
      report: null,
      fullText: this.fullText
    };
    saveReport(reportEntry);

    // 显示"正在后台生成"提示
    this.reportBody.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:24px;margin-bottom:12px;">⏳</div>
        <p style="color:#ffa94d;">正在后台生成报告...</p>
        <p style="color:#666;font-size:12px;margin-top:8px;">生成完成后会自动显示，可先关闭此窗口继续训练</p>
      </div>`;
    this.reportModal.classList.remove('hidden');
    this.currentReportId = reportId;

    // 异步生成
    const customPrompt = loadCustomPrompt();
    const prompt = getReportPrompt(this.fullText, this.stats, customPrompt);
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];

    callAI(messages, 8192).then(result => {
      if (result) {
        this.lastReport = result;
        updateReport(reportId, { status: 'completed', report: result });
        // 如果弹窗还开着且是同一个报告，自动填充
        if (!this.reportModal.classList.contains('hidden') && this.currentReportId === reportId) {
          this.renderReport(result);
        }
        this.addFeedbackItem('报告生成完成', 'good');
      } else {
        updateReport(reportId, { status: 'failed', report: null });
        if (!this.reportModal.classList.contains('hidden') && this.currentReportId === reportId) {
          this.reportBody.innerHTML = `<p style="color:#ff6b6b;">生成失败：请检查设置中的API Key是否正确。</p>`;
        }
        this.addFeedbackItem('报告生成失败', 'hedge');
      }
    }).catch(err => {
      console.error('[报告] 生成异常:', err);
      updateReport(reportId, { status: 'failed', report: null });
      if (!this.reportModal.classList.contains('hidden') && this.currentReportId === reportId) {
        this.reportBody.innerHTML = `<p style="color:#ff6b6b;">生成失败: ${err.message}</p>`;
      }
    });
  }

  renderReport(report) {
    this.reportBody.innerHTML = this.renderReportContent(report);
  }

  downloadReport() {
    if (!this.lastReport) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const markdown = `# 表达训练报告\n\n**日期**: ${dateStr}  \n**时长**: ${this.stats.duration}秒  \n**总字数**: ${this.stats.totalWords}  \n\n---\n\n## 完整原文\n\n${this.fullText}\n\n---\n\n${this.lastReport}`;
    const filename = `表达训练-${dateStr}-${timeStr}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const btn = document.getElementById('btn-download-report-header');
    btn.textContent = '✅ 已下载';
    setTimeout(() => { btn.textContent = '💾 下载'; }, 2000);
  }

  copyReport() {
    const reportText = this.reportBody.innerText;
    navigator.clipboard.writeText(reportText).then(() => {
      const btn = document.getElementById('btn-copy-report');
      btn.textContent = '✅ 已复制';
      setTimeout(() => { btn.textContent = '📋 复制全文'; }, 2000);
    });
  }

  // ===== 粘贴逐字稿分析 =====
  openPasteModal() {
    document.getElementById('paste-textarea').value = '';
    this.pasteModal.classList.remove('hidden');
    document.getElementById('paste-textarea').focus();
  }

  analyzePastedText() {
    const text = document.getElementById('paste-textarea').value.trim();
    if (!text) return;

    this.pasteModal.classList.add('hidden');
    this.subtitleContainer.innerHTML = '';
    this.fullText = text;
    this.resetStats();

    const sentences = text.split(/(?<=[。！？\n])/g).filter(s => s.trim());
    this.sentences = sentences;

    for (const sentence of sentences) {
      const line = document.createElement('div');
      line.className = 'subtitle-line';
      line.innerHTML = this.highlightText(sentence.trim());
      this.subtitleContainer.appendChild(line);

      const analysis = analyzeText(sentence);
      if (analysis) {
        this.stats.fillers += analysis.fillers.length;
        this.stats.hedges += analysis.hedges.length;
        this.stats.vagueWords += analysis.vagueWords.length;
        this.stats.totalWords += analysis.totalWords;
      }
    }

    this.stats.duration = 0;
    this.updateStatsDisplay();

    this.btnReport.classList.remove('hidden');
    this.btnCopyText.classList.remove('hidden');
    this.btnSaveText.classList.remove('hidden');
    this.btnClear.classList.remove('hidden');

    this.requestRealtimeFeedback();
  }

  // ===== 工具 =====
  updateTimer() {
    let totalPaused = this.pausedTime;
    if (this.pauseStart) totalPaused += Date.now() - this.pauseStart;
    const elapsed = Math.floor((Date.now() - this.startTime - totalPaused) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    this.timer.textContent = `${minutes}:${seconds}`;
  }

  resetStats() {
    this.stats = { fillers: 0, hedges: 0, vagueWords: 0, totalWords: 0, duration: 0 };
    this.wordCounts = {};
    this.updateStatsDisplay();
    this.feedbackContent.innerHTML = '';
  }

  showError(msg) {
    const line = document.createElement('div');
    line.className = 'subtitle-line';
    line.style.color = '#ff6b6b';
    line.textContent = msg;
    this.subtitleContainer.appendChild(line);
  }

  copyOriginalText() {
    if (!this.fullText.trim()) return;
    navigator.clipboard.writeText(this.fullText).then(() => {
      this.btnCopyText.textContent = '已复制';
      setTimeout(() => { this.btnCopyText.textContent = '复制'; }, 1500);
    });
  }

  saveOriginalText() {
    if (!this.fullText.trim()) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const markdown = `# 表达训练原文\n\n**日期**: ${dateStr}\n\n---\n\n${this.fullText}`;
    const filename = `原文-${dateStr}-${timeStr}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    this.btnSaveText.textContent = '已保存';
    setTimeout(() => { this.btnSaveText.textContent = '保存'; }, 2000);
  }

  clearAll() {
    this.fullText = '';
    this.sentences = [];
    this.lastReport = '';
    this.subtitleContainer.innerHTML = '<div class="subtitle-line hint">点击下方按钮开始说话</div>';
    this.feedbackContent.innerHTML = '';
    this.resetStats();
    this.timer.textContent = '00:00';
    this.timer.classList.remove('active');
    this.btnReport.classList.add('hidden');
    this.btnCopyText.classList.add('hidden');
    this.btnSaveText.classList.add('hidden');
    this.btnClear.classList.add('hidden');
  }

  // ===== 历史报告 =====
  showReportHistory() {
    this.historyDetail.classList.add('hidden');
    this.historyList.classList.remove('hidden');
    this.historyModal.classList.remove('hidden');

    const reports = loadReports();
    this.renderHistoryList(reports);
  }

  renderHistoryList(reports) {
    if (!reports || reports.length === 0) {
      this.historyList.innerHTML = '<div class="history-empty">暂无历史报告\n完成一次训练并生成报告后，这里会显示记录</div>';
      return;
    }

    this.historyList.innerHTML = reports.map(r => {
      const statusLabel = r.status === 'completed' ? '✅ 已完成' :
                          r.status === 'generating' ? '⏳ 生成中' :
                          '❌ 失败';
      const statusClass = r.status === 'completed' ? 'completed' :
                          r.status === 'generating' ? 'generating' : 'failed';

      const statsHtml = r.stats ? `
        <div class="history-item-stats">
          <span>🔴 ${r.stats.fillers || 0}</span>
          <span>🟡 ${r.stats.hedges || 0}</span>
          <span>🟠 ${r.stats.vagueWords || 0}</span>
          <span>🟢 ${r.stats.totalWords || 0}字</span>
          ${r.stats.duration ? `<span>⏱️ ${Math.floor(r.stats.duration / 60)}分${r.stats.duration % 60}秒</span>` : ''}
        </div>` : '';

      const deleteBtn = r.status !== 'generating'
        ? `<button class="history-btn-delete" data-id="${r.id}" title="删除">🗑️</button>`
        : '';

      return `
        <div class="history-item" data-id="${r.id}">
          <div class="history-item-left">
            <div class="history-item-date">${r.date || '未知时间'}</div>
            <div class="history-item-preview">${r.textPreview || '(无文本)'}</div>
            ${statsHtml}
          </div>
          <div class="history-item-right">
            <span class="history-status ${statusClass}">${statusLabel}</span>
            ${r.status === 'completed' ? `<button class="history-btn-view" data-id="${r.id}">查看</button>` : ''}
            ${deleteBtn}
          </div>
        </div>`;
    }).join('');

    // 绑定事件
    this.historyList.querySelectorAll('.history-btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.viewReportDetail(btn.dataset.id);
      });
    });
    this.historyList.querySelectorAll('.history-btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.deleteReportItem(btn.dataset.id);
      });
    });
    this.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const report = reports.find(r => r.id === id);
        if (report && report.status === 'completed') {
          this.viewReportDetail(id);
        }
      });
    });
  }

  viewReportDetail(reportId) {
    const reports = loadReports();
    const report = reports.find(r => r.id === reportId);
    if (!report || report.status !== 'completed') return;

    this.historyList.classList.add('hidden');
    this.historyDetail.classList.remove('hidden');

    const statsHtml = report.stats ? `
      <div class="history-detail-stats">
        <span>🔴 填充词: ${report.stats.fillers || 0}</span>
        <span>🟡 犹豫词: ${report.stats.hedges || 0}</span>
        <span>🟠 笼统词: ${report.stats.vagueWords || 0}</span>
        <span>🟢 总字数: ${report.stats.totalWords || 0}</span>
        ${report.stats.duration ? `<span>⏱️ 时长: ${Math.floor(report.stats.duration / 60)}分${report.stats.duration % 60}秒</span>` : ''}
        ${report.stats.totalWords ? `<span>📊 密度: ${((report.stats.totalWords - (report.stats.fillers || 0) - (report.stats.hedges || 0)) / report.stats.totalWords * 100).toFixed(0)}%</span>` : ''}
      </div>` : '';

    this.historyDetail.innerHTML = `
      <div class="history-detail-header">
        <button class="history-btn-back" id="history-btn-back">← 返回列表</button>
        <span class="history-detail-date">${report.date || '未知时间'}</span>
      </div>
      ${statsHtml}
      <div class="history-detail-report">${this.renderReportContent(report.report || '')}</div>`;

    document.getElementById('history-btn-back').addEventListener('click', () => {
      this.showReportHistory();
    });
  }

  async deleteReportItem(reportId) {
    deleteReport(reportId);
    this.addFeedbackItem('🗑️ 已删除一条历史报告', 'good');
    const reports = loadReports();
    this.renderHistoryList(reports);
  }

  // Markdown → HTML 渲染（复用于报告和历史报告）
  renderReportContent(reportText) {
    if (!reportText) return '';
    let html = reportText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // 表格处理
    html = html.replace(/((?:<br>)?\|[^|]+\|<br>(?:\|[^|]+\|<br>)*)/g, (match) => {
      const rows = match.split('<br>').filter(r => r.trim());
      const tableRows = rows.map(r => {
        const cells = r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        if (cells.every(c => /^:?-+:?$/.test(c))) return '';
        return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
      }).filter(Boolean).join('');
      return tableRows ? `<table>${tableRows}</table>` : match;
    });

    return `<p>${html}</p>`;
  }
}

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', () => { new ExpressionTrainer(); });
