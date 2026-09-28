/**
 * 小小 AI 老师 — 可交付版
 * - 真实大模型（Atria-Dawn-Preview，OpenAI 兼容）
 * - 本地兜底（断网/失败时仍可用）
 * - 智能出题 / 智能判分 / 个性化鼓励
 */
const AITeacher = {
  praise: [
    "太棒了！你真聪明！",
    "哇，写得真好看！",
    "超级厉害！星星送给你！",
    "你是小小学习高手！",
    "完全正确，继续加油！",
    "进步好快呀，真棒！",
    "AI 老师给你点个大大的赞！"
  ],
  encourage: [
    "差一点就对了，再试一次！",
    "没关系，慢慢来，你可以的！",
    "再仔细看看笔顺哦～",
    "加油，下一次一定行！",
    "错了也没关系，我们一起再练一遍！"
  ],
  mathPraise: [
    "算得又快又准！",
    "数学小天才就是你！",
    "完全正确！",
    "反应好快呀！"
  ],

  random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
  getPraise() { return this.random(this.praise); },
  getEncourage() { return this.random(this.encourage); },
  getMathPraise() { return this.random(this.mathPraise); },

  genMathQuestion(level = 1) {
    level = Math.min(3, Math.max(1, level));
    const op = Math.random() > 0.45 ? "+" : "-";
    let a, b, answer;
    if (op === "+") {
      if (level === 1) {
        a = 1 + Math.floor(Math.random() * 8);
        b = 1 + Math.floor(Math.random() * (9 - a));
      } else {
        a = 2 + Math.floor(Math.random() * 12);
        b = 2 + Math.floor(Math.random() * (18 - a));
      }
      answer = a + b;
    } else {
      if (level === 1) {
        a = 3 + Math.floor(Math.random() * 7);
        b = 1 + Math.floor(Math.random() * (a - 1));
      } else {
        a = 6 + Math.floor(Math.random() * 12);
        b = 1 + Math.floor(Math.random() * (a - 1));
      }
      answer = a - b;
    }
    const opts = new Set([answer]);
    while (opts.size < 4) {
      const delta = 1 + Math.floor(Math.random() * 4);
      const wrong = answer + (Math.random() > 0.5 ? delta : -delta);
      if (wrong >= 0 && wrong !== answer) opts.add(wrong);
    }
    return {
      a, b, op, answer,
      options: Array.from(opts).sort(() => Math.random() - 0.5),
      level
    };
  },

  genMathQuiz(count = 3, level = 1) {
    return Array.from({ length: count }, () => this.genMathQuestion(level));
  },

  gradeMath(userAnswer, correctAnswer) {
    const ok = Number(userAnswer) === Number(correctAnswer);
    return {
      correct: ok,
      score: ok ? 100 : 0,
      message: ok ? this.getMathPraise() : this.getEncourage(),
      stars: ok ? 1 : 0
    };
  },

  gradeHanzi(totalMistakes, totalStrokes) {
    const ratio = totalStrokes > 0 ? 1 - totalMistakes / (totalStrokes + totalMistakes) : 0;
    let score = Math.round(ratio * 100);
    if (totalMistakes === 0) score = 100;
    else if (score < 40) score = 40;
    return {
      score,
      message: score >= 90 ? this.getPraise() : score >= 60 ? "写得不错，再练练就更完美啦！" : this.getEncourage(),
      stars: score >= 90 ? 1 : 0
    };
  },

  async askLLM(userPrompt, systemPrompt) {
    if (typeof AI_CONFIG === "undefined" || !AI_CONFIG.enabled || !AI_CONFIG.apiKey) {
      return { ok: false, text: "", error: "disabled" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_CONFIG.timeout || 45000);
    try {
      const res = await fetch(AI_CONFIG.baseURL + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + AI_CONFIG.apiKey
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: [
            {
              role: "system",
              content: systemPrompt || "你是面向幼儿园到小学低年级的中文启蒙老师。说话温暖、简短、鼓励，不要用复杂词。"
            },
            { role: "user", content: userPrompt }
          ],
          max_tokens: AI_CONFIG.maxTokens || 800,
          temperature: AI_CONFIG.temperature || 0.5
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("[AITeacher] HTTP", res.status, errText.slice(0, 200));
        return { ok: false, text: "", error: "http_" + res.status };
      }
      const data = await res.json();
      const msg = data.choices && data.choices[0] && data.choices[0].message;
      if (!msg) return { ok: false, text: "", error: "empty" };

      let text = (msg.content || "").trim();
      if (!text && msg.reasoning_content) {
        const lines = msg.reasoning_content.split(/\n/).map(l => l.trim()).filter(Boolean);
        const last = lines.reverse().find(l => /[\u4e00-\u9fff]/.test(l) && l.length < 80);
        if (last) text = last.replace(/^["「]|["」]$/g, "");
      }
      text = text.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
      if (!text) return { ok: false, text: "", error: "no_content" };

      return { ok: true, text, raw: data };
    } catch (e) {
      clearTimeout(timer);
      console.warn("[AITeacher] 请求失败", e.message || e);
      return { ok: false, text: "", error: e.name === "AbortError" ? "timeout" : String(e.message || e) };
    }
  },

  async praiseForChar(char, score, mistakes) {
    const local = score >= 100 ? this.getPraise() : score >= 70 ? "写得不错，再练练就更完美啦！" : this.getEncourage();
    const prompt =
      score >= 100
        ? `小朋友刚完美写出汉字「${char}」，零失误。请用一句很温暖的话表扬他（不要超过25字）。`
        : score >= 70
          ? `小朋友写汉字「${char}」得分${score}分，有${mistakes}处小错误。请温柔鼓励并提醒再练一练（不超过30字）。`
          : `小朋友写「${char}」还不熟练。请温柔鼓励他再试一次（不超过25字）。`;
    const r = await this.askLLM(prompt);
    return r.ok ? r.text : local;
  },

  async praiseForMath(correct, total) {
    const local = `答对 ${correct}/${total} 题！` + this.getMathPraise();
    const prompt = `小朋友数学闯关答对了 ${correct} 道，一共 ${total} 道。请用一句简短中文表扬或鼓励（不超过30字）。`;
    const r = await this.askLLM(prompt);
    return r.ok ? r.text : local;
  },

  async explainChar(char, pinyin, meaning) {
    const local = `${char}，读作${pinyin}，意思是${meaning}。`;
    const prompt = `用两句以内、适合幼儿园到小学低年级的话，讲解汉字「${char}」（拼音${pinyin}，意思：${meaning}）。可以提一提怎么记这个字。不要列表。`;
    const r = await this.askLLM(prompt);
    return r.ok ? r.text : local;
  },

  async praiseEnglish(word, cn) {
    const local = "Great job! 说得真棒！";
    const prompt = `小朋友学会了英语单词 ${word}（${cn}）。请用一句中英混杂、适合儿童的话鼓励他（不超过30字）。`;
    const r = await this.askLLM(prompt);
    return r.ok ? r.text : local;
  },

  async testConnection() {
    const r = await this.askLLM(
      "只回复这四个字：连接成功",
      "你是测试助手。用户让你回复固定内容时，只输出那几个字，不要多说。"
    );
    return r;
  }
};
