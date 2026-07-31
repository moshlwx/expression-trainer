// 宇宙无敌表达训练系统 V2

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
    this.lastFeedbackText = '';
    this.lastReport = '';
    this.currentReportId = null; // 异步报告ID

    this.initElements();
    this.bindEvents();
    this.setupReportListener();
  }

  initElements() {
    this.btnStart = document.getElementById('btn-start');
    this.btnPaste = document.getElementById('btn-paste');
    this.btnPause = document.getElementById('btn-pause');
    this.btnResume = document.getElementById('btn-resume');
    this.btnStop = document.getElementById('btn-stop');
    this.btnReport = document.getElementById('btn-report');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnCloseReport = document.getElementById('btn-close-report');
    this.btnClosePaste = document.getElementById('btn-close-paste');
    this.btnAnalyzePaste = document.getElementById('btn-analyze-paste');
    this.btnCopyText = document.getElementById('btn-copy-text');
    this.btnSaveText = document.getElementById('btn-save-text');
    this.btnClear = document.getElementById('btn-clear');
    this.btnCopyReport = document.getElementById('btn-copy-report');
    this.pasteModal = document.getElementById('paste-modal');
    this.pasteTextarea = document.getElementById('paste-textarea');
    this.timer = document.getElementById('timer');
    this.subtitleScroll = document.getElementById('subtitle-scroll');
    this.subtitleContainer = document.getElementById('subtitle-container');
    this.feedbackContent = document.getElementById('feedback-content');
    this.reportModal = document.getElementById('report-modal');
    this.reportBody = document.getElementById('report-body');
    this.statFillers = document.getElementById('stat-fillers');
    this.statHedges = document.getElementById('stat-hedges');
    this.statVague = document.getElementById('stat-vague');
    this.statDensity = document.getElementById('stat-density');
    // 历史报告
    this.btnHistory = document.getElementById('btn-history');
    this.historyModal = document.getElementById('history-modal');
    this.historyBody = document.getElementById('history-body');
    this.historyList = document.getElementById('history-list');
    this.historyDetail = document.getElementById('history-detail');
    this.btnCloseHistory = document.getElementById('btn-close-history');
  }

  bindEvents() {
    this.btnStart.addEventListener('click', () => this.startRecording());
    this.btnPaste.addEventListener('click', () => this.openPasteModal());
    this.btnPause.addEventListener('click', () => this.pauseRecording());
    this.btnResume.addEventListener('click', () => this.resumeRecording());
    this.btnStop.addEventListener('click', () => this.stopRecording());
    this.btnReport.addEventListener('click', () => this.generateReport());
    this.btnSettings.addEventListener('click', () => window.api.openSettings());
    document.getElementById('btn-prompt-editor').addEventListener('click', () => window.api.openPromptEditor());
    this.btnCloseReport.addEventListener('click', () => this.reportModal.classList.add('hidden'));
    this.btnCopyReport.addEventListener('click', () => {
      const reportText = this.reportBody.innerText;
      navigator.clipboard.writeText(reportText).then(() => {
        this.btnCopyReport.textContent = '✅ 已复制';
        setTimeout(() => { this.btnCopyReport.textContent = '📋 复制全文'; }, 2000);
      });
    });
    this.btnClosePaste.addEventListener('click', () => this.pasteModal.classList.add('hidden'));
    this.btnAnalyzePaste.addEventListener('click', () => this.analyzePastedText());
    this.btnCopyText.addEventListener('click', () => this.copyOriginalText());
    this.btnSaveText.addEventListener('click', () => this.saveOriginalText());
    this.btnClear.addEventListener('click', () => this.clearAll());
    // 历史报告
    this.btnHistory.addEventListener('click', () => this.showReportHistory());
    this.btnCloseHistory.addEventListener('click', () => this.historyModal.classList.add('hidden'));
  }

  // ===== 录制控制 =====

  async startRecording() {
    const initResult = await window.api.initASR();
    if (!initResult.success) {
      this.showError(`语音识别启动失败: ${initResult.error}`);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.audioProcessor.onaudioprocess = async (e) => {
        if (!this.isRecording || this.isPaused) return;
        const samples = e.inputBuffer.getChannelData(0);
        const result = await window.api.feedAudio(samples);
        if (result) this.handleASRResult(result);
      };
      source.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);
      this.mediaStream = stream;
    } catch (err) {
      this.showError(`麦克风访问失败: ${err.message}`);
      return;
    }

    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.fullText = '';
    this.sentences = [];
    this.resetStats();
    this.subtitleContainer.innerHTML = '';

    // UI
    this.btnStart.classList.add('hidden');
    this.btnPause.classList.remove('hidden');
    this.btnStop.classList.remove('hidden');
    this.btnReport.classList.add('hidden');
    this.btnResume.classList.add('hidden');
    this.timer.classList.add('active');

    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  pauseRecording() {
    this.isPaused = true;
    this.pauseStart = Date.now();
    this.btnPause.classList.add('hidden');
    this.btnResume.classList.remove('hidden');
    this.timer.classList.remove('active');
  }

  resumeRecording() {
    this.isPaused = false;
    this.pausedTime += Date.now() - this.pauseStart;
    this.pauseStart = null;
    this.btnResume.classList.add('hidden');
    this.btnPause.classList.remove('hidden');
    this.timer.classList.add('active');
  }

  async stopRecording() {
    if (this.audioProcessor) { this.audioProcessor.disconnect(); this.audioProcessor = null; }
    if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => t.stop()); this.mediaStream = null; }
    await window.api.stopASR();
    this.isRecording = false;
    this.isPaused = false;

    clearInterval(this.timerInterval);
    let totalPaused = this.pausedTime;
    if (this.pauseStart) totalPaused += Date.now() - this.pauseStart;
    this.stats.duration = Math.floor((Date.now() - this.startTime - totalPaused) / 1000);

    // UI：显示生成报告按钮，可翻阅字幕
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

      // 每30字触发一次AI反馈（语境化精准词建议）
      if (this.fullText.length - this.lastFeedbackText.length >= 30) {
        this.requestRealtimeFeedback();
      }
    }
    this.renderSubtitle(text, isFinal);
  }

  renderSubtitle(currentText, isFinal) {
    if (isFinal) {
      // 移除interim
      const interim = this.subtitleContainer.querySelector('.interim-line');
      if (interim) interim.remove();

      // 旧行变灰
      this.subtitleContainer.querySelectorAll('.subtitle-line:not(.old)').forEach(el => {
        el.classList.add('old');
      });

      // 新行
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

    // 自动滚到底
    this.subtitleScroll.scrollTop = this.subtitleScroll.scrollHeight;
  }

  highlightText(text) {
    let result = text;
    const vagueWords = ['开心','难过','害怕','生气','不舒服','很好','很多','很快','很大','很小','好看','不好','喜欢','讨厌','觉得','想想'];
    vagueWords.forEach(w => {
      result = result.replace(new RegExp(w, 'g'), `<span class="vague">${w}</span>`);
    });
    const fillerPatterns = /(嗯|啊|呃|额|那个|就是|然后|这个|对吧|是吧|反正|基本上)/g;
    result = result.replace(fillerPatterns, '<span class="filler">$1</span>');
    const hedgePatterns = /(可能|也许|大概|应该|我觉得|好像|似乎|或许|不一定|差不多|感觉)/g;
    result = result.replace(hedgePatterns, '<span class="hedge">$1</span>');
    return result;
  }

  // ===== 分析 =====

  async analyzeCurrentSentence(text) {
    const analysis = await window.api.analyzeText(text);
    if (analysis) {
      this.stats.fillers += analysis.fillers.length;
      this.stats.hedges += analysis.hedges.length;
      this.stats.vagueWords += analysis.vagueWords.length;
      this.stats.totalWords += analysis.totalWords;
      this.updateStatsDisplay();
      // 碰到笼统词 → 立刻在反馈栏弹出替换建议
      if (analysis.vagueWords && analysis.vagueWords.length > 0) {
        analysis.vagueWords.forEach(item => {
          const alts = item.alternatives.slice(0, 3).join(' / ');
          this.addFeedbackItem(`「${item.word}」→ ${alts}`, 'vague');
        });
      }
      // 碰到填充词 → 弹提醒
      if (analysis.fillers && analysis.fillers.length >= 2) {
        const uniqueFillers = [...new Set(analysis.fillers.map(f => f.word))].slice(0, 3);
        this.addFeedbackItem(`填充词：${uniqueFillers.join('、')}——试试停顿`, 'filler');
      }
      // 碰到犹豫词 → 弹提醒
      if (analysis.hedges && analysis.hedges.length >= 1) {
        const uniqueHedges = [...new Set(analysis.hedges.map(h => h.word))].slice(0, 2);
        this.addFeedbackItem(`「${uniqueHedges.join('」「')}」→ 直接说`, 'hedge');
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

  // ===== 实时反馈 =====

  async requestRealtimeFeedback() {
    this.lastFeedbackText = this.fullText;
    const result = await window.api.getRealtimeFeedback(this.fullText);
    if (result.success && result.feedback) {
      const lines = result.feedback.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const type = this.classifyFeedback(line.trim());
        this.addFeedbackItem(line.trim(), type);
      });
    }
  }

  classifyFeedback(text) {
    if (text === '✓' || text.includes('✓')) return 'good';
    // 填充词相关
    const fillerKeywords = ['嗯','啊','呃','那个','就是','然后','这个','对吧','是吧','反正','基本上','所以说'];
    if (fillerKeywords.some(w => text.includes(`「${w}」`))) return 'filler';
    // 犹豫词相关
    const hedgeKeywords = ['可能','也许','大概','应该','我觉得','好像','似乎','感觉','或许'];
    if (hedgeKeywords.some(w => text.includes(`「${w}」`))) return 'hedge';
    // 其他精准词替换
    if (text.includes('→')) return 'vague';
    return 'ai';
  }

  addFeedbackItem(text, type = 'ai') {
    // 去重：如果前3条已经有相同内容，跳过
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

  setupReportListener() {
    window.api.onReportGenerated((data) => {
      if (data.status === 'completed') {
        this.lastReport = data.report;
        // 如果报告弹窗当前是打开状态且显示的是该报告的"生成中"状态，则自动填充
        if (!this.reportModal.classList.contains('hidden') && this.currentReportId === data.id) {
          this.renderReport(data.report);
        }
        this.addFeedbackItem('✅ 报告生成完成', 'good');
      } else if (data.status === 'failed') {
        if (!this.reportModal.classList.contains('hidden') && this.currentReportId === data.id) {
          this.reportBody.innerHTML = `<p style="color:#ff6b6b;">生成失败: ${data.error}</p>`;
        }
        this.addFeedbackItem(`❌ 报告生成失败: ${data.error}`, 'hedge');
      }
    });
  }

  async generateReport() {
    // 异步启动报告生成
    this.reportBody.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:24px;margin-bottom:12px;">⏳</div>
        <p style="color:#ffa94d;">正在后台生成报告...</p>
        <p style="color:#666;font-size:12px;margin-top:8px;">生成完成后会自动通知你，可先关闭此窗口继续训练</p>
      </div>`;
    this.reportModal.classList.remove('hidden');

    const result = await window.api.requestReportAsync({
      fullText: this.fullText,
      stats: this.stats
    });

    if (result.success) {
      this.currentReportId = result.reportId;
    } else {
      this.reportBody.innerHTML = `<p style="color:#ff6b6b;">启动生成失败: ${result.error}</p>`;
    }
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

  // ===== 复制 & 保存原文 & 清空 =====

  copyOriginalText() {
    if (!this.fullText.trim()) return;
    navigator.clipboard.writeText(this.fullText).then(() => {
      this.btnCopyText.textContent = '✓ 已复制';
      setTimeout(() => { this.btnCopyText.textContent = '📋 复制'; }, 1500);
    });
  }

  async saveOriginalText() {
    if (!this.fullText.trim()) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const markdown = `# 表达训练原文\n\n**日期**: ${dateStr}\n\n---\n\n${this.fullText}`;
    const filename = `原文-${dateStr}-${timeStr}.md`;

    try {
      const result = await window.api.saveFile(markdown, filename);
      if (result.success) {
        this.btnSaveText.textContent = '✓ 已保存';
        setTimeout(() => { this.btnSaveText.textContent = '💾 保存'; }, 2000);
      }
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
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

  // ===== 粘贴逐字稿分析 =====

  openPasteModal() {
    this.pasteTextarea.value = '';
    this.pasteModal.classList.remove('hidden');
    this.pasteTextarea.focus();
  }

  async analyzePastedText() {
    const text = this.pasteTextarea.value.trim();
    if (!text) return;

    // 关闭粘贴弹窗
    this.pasteModal.classList.add('hidden');

    // 把文本显示到字幕区（高亮标记）
    this.subtitleContainer.innerHTML = '';
    this.fullText = text;
    this.resetStats();

    // 按句号/问号/感叹号/换行分句
    const sentences = text.split(/(?<=[。！？\n])/g).filter(s => s.trim());
    this.sentences = sentences;

    for (const sentence of sentences) {
      const line = document.createElement('div');
      line.className = 'subtitle-line';
      line.innerHTML = this.highlightText(sentence.trim());
      this.subtitleContainer.appendChild(line);

      // 词库分析
      const analysis = await window.api.analyzeText(sentence);
      if (analysis) {
        this.stats.fillers += analysis.fillers.length;
        this.stats.hedges += analysis.hedges.length;
        this.stats.vagueWords += analysis.vagueWords.length;
        this.stats.totalWords += analysis.totalWords;
      }
    }

    this.stats.duration = 0; // 粘贴模式没有时长
    this.updateStatsDisplay();

    // 显示操作按钮
    this.btnReport.classList.remove('hidden');
    this.btnCopyText.classList.remove('hidden');
    this.btnSaveText.classList.remove('hidden');
    this.btnClear.classList.remove('hidden');

    // 请求AI语境化反馈
    this.requestRealtimeFeedback();
  }

  // ===== 历史报告 =====

  async showReportHistory() {
    this.historyDetail.classList.add('hidden');
    this.historyList.classList.remove('hidden');
    this.historyModal.classList.remove('hidden');

    const reports = await window.api.getReportHistory();
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
        await this.deleteReportItem(btn.dataset.id);
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

  async viewReportDetail(reportId) {
    const report = await window.api.getReportDetail(reportId);
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
    const result = await window.api.deleteReport(reportId);
    if (result.success) {
      this.addFeedbackItem('🗑️ 已删除一条历史报告', 'good');
      // 刷新列表
      const reports = await window.api.getReportHistory();
      this.renderHistoryList(reports);
    }
  }

  renderReportContent(reportText) {
    // 将 Markdown 格式的报告转换为 HTML
    let html = reportText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 代码块
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 标题
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // 加粗
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // 引用
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // 无序列表
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      // 段落
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // 表格处理：将连续的 |...| 行包裹在 <table> 中
    html = html.replace(/((?:<br>)?\|[^|]+\|<br>(?:\|[^|]+\|<br>)*)/g, (match) => {
      const rows = match.split('<br>').filter(r => r.trim());
      const isSep = rows.some(r => /^\|[\s:|-]+\|$/.test(r));
      const tableRows = rows.map(r => {
        const cells = r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        if (cells.every(c => /^:?-+:?$/.test(c))) return '';
        return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
      }).filter(Boolean).join('');
      return tableRows ? `<table>${tableRows}</table>` : match;
    });

    return `<p>${html}</p>`;
  }

  // 重写 renderReport 使用 renderReportContent
  renderReport(reportText) {
    this.reportBody.innerHTML = `
      <div style="text-align:right;margin-bottom:12px;">
        <button id="btn-save-report" style="background:#E5007E;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-size:12px;cursor:pointer;">💾 保存为 Markdown</button>
      </div>
      ${this.renderReportContent(reportText)}`;

    document.getElementById('btn-save-report').addEventListener('click', () => this.saveReportToFile());
  }

  async saveReportToFile() {
    if (!this.lastReport) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const markdown = `# 表达训练报告\n\n**日期**: ${dateStr}  \n**时长**: ${this.stats.duration}秒  \n**总字数**: ${this.stats.totalWords}  \n\n---\n\n## 完整原文\n\n${this.fullText}\n\n---\n\n${this.lastReport}`;
    const filename = `表达训练-${dateStr}-${timeStr}.md`;

    try {
      const result = await window.api.saveFile(markdown, filename);
      if (result.success) {
        const btn = document.getElementById('btn-save-report');
        btn.textContent = '✓ 已保存';
        btn.style.background = '#333';
        setTimeout(() => { btn.textContent = '💾 保存为 Markdown'; btn.style.background = '#E5007E'; }, 2000);
      }
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => { new ExpressionTrainer(); });
