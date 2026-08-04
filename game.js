(() => {
  "use strict";

  const STORAGE_KEY = "esther-voice-prefs-v3";

  const speakers = {
    narrator: { label: "Storyteller", role: "narrator" },
    esther: { label: "Esther", role: "esther" },
    king: { label: "The King", role: "king" },
    haman: { label: "Haman", role: "haman" },
  };

  const PREVIEW_LINES = {
    esther: "I am Queen Esther. Please… listen carefully to my request.",
    king: "I am the king. What do you need?",
    haman: "I am Haman. I think I am very important!",
    narrator: "Once upon a time, in a big palace, Queen Esther had to be very brave.",
  };

  /** @type {{ esther: SpeechSynthesisVoice | null, king: SpeechSynthesisVoice | null, haman: SpeechSynthesisVoice | null, narrator: SpeechSynthesisVoice | null }} */
  const voiceCast = {
    esther: null,
    king: null,
    haman: null,
    narrator: null,
  };

  const state = {
    day: 1,
    muted: false,
    musicMuted: false,
    musicStarted: false,
    currentLine: null,
    busy: false,
    dialogGen: 0,
    availableVoices: /** @type {SpeechSynthesisVoice[]} */ ([]),
  };

  const MUSIC_VOLUME = 0.06;

  const el = {
    scene: document.getElementById("scene"),
    dialog: document.getElementById("dialog"),
    speakerName: document.getElementById("speaker-name"),
    dialogText: document.getElementById("dialog-text"),
    choices: document.getElementById("choices"),
    muteBtn: document.getElementById("mute-btn"),
    musicBtn: document.getElementById("music-btn"),
    bgMusic: document.getElementById("bg-music"),
    continueBtn: document.getElementById("continue-btn"),
    endingContinue: document.getElementById("ending-continue"),
    voicesBtn: document.getElementById("voices-btn"),
    voiceOverlay: document.getElementById("voice-overlay"),
    voiceDone: document.getElementById("voice-done"),
    voiceReset: document.getElementById("voice-reset"),
    voiceSelects: {
      esther: document.getElementById("voice-esther"),
      king: document.getElementById("voice-king"),
      haman: document.getElementById("voice-haman"),
      narrator: document.getElementById("voice-narrator"),
    },
    replayBtn: document.getElementById("replay-voice"),
    overlay: document.getElementById("ending-overlay"),
    endingTitle: document.getElementById("ending-title"),
    endingBody: document.getElementById("ending-body"),
    endingArt: document.getElementById("ending-art"),
    restartBtn: document.getElementById("restart-btn"),
  };

  const ART = "FB_GSI_Esther_JPEGW";

  function art(n) {
    const id = String(n).padStart(2, "0");
    return `${ART}/${id}_FB_GSI_Esther_1920.jpg`;
  }

  const scenes = {
    title: {
      image: art(11),
      visual: "visual-title",
      kicker: "A Bible story game",
      title: "Into the King's Court",
      body: "Help Queen Esther be brave! Wait for the right day, then ask the king and mean Haman to dinner. At dinner, tell the king the truth—Haman wants to hurt Esther and her people.",
      lines: [
        {
          speaker: "narrator",
          text: "Long ago, Queen Esther lived in a big palace. Her people needed help. Can you help her choose wisely?",
        },
      ],
      choices: [{ label: "Let's play!", next: "chamber" }],
    },

    chamber: {
      getImage: () => (state.day === 1 ? art(25) : state.day === 2 ? art(27) : art(28)),
      visual: "visual-chamber",
      kicker: "Esther's room",
      title: "Wait three days",
      getBody: () =>
        state.day === 1
          ? "Esther is praying and not eating for three days. If she goes to the king too soon, she could get in big trouble. Wait until day 3!"
          : state.day === 2
            ? "Day 2. Mordecai says Haman wants to hurt God's people. Esther keeps waiting and praying. One more day!"
            : "Day 3! Esther and her friends prayed. Now she puts on her queen clothes to see the king—even though that is very dangerous.",
      getExtraHtml: () => `
        <div class="day-meter" aria-label="Day ${state.day} of 3">
          <span class="day-pip ${state.day >= 1 ? "filled" : ""}"></span>
          <span class="day-pip ${state.day >= 2 ? "filled" : ""}"></span>
          <span class="day-pip ${state.day >= 3 ? "filled" : ""}"></span>
        </div>
        <p class="scene-body" style="margin-top:0.75rem">Day ${state.day} of 3</p>
      `,
      getLines: () => {
        if (state.day === 1) {
          return [
            {
              speaker: "esther",
              text: "I want to help my people. But I must wait. Going too early would be a big mistake.",
            },
          ];
        }
        if (state.day === 2) {
          return [
            {
              speaker: "esther",
              text: "Just one more day. Please, God, help me be brave. Please help the king be kind.",
            },
          ];
        }
        return [
          {
            speaker: "esther",
            text: "Today I will go see the king. I am scared, but I will trust God. If I die, I die.",
          },
        ];
      },
      getChoices: () => {
        const choices = [
          {
            label: "Go see the king right now",
            next: state.day >= 3 ? "court_enter" : "death_early",
          },
        ];
        if (state.day < 3) {
          choices.unshift({
            label: "Wait one more day and keep praying",
            action: "waitDay",
          });
        }
        return choices;
      },
    },

    death_early: {
      ending: "defeat",
      image: art(24),
      title: "Oh no!",
      body: "Esther went in too early. Mean Haman acted right away. He killed the Jews—and Esther cries in sorrow.",
      lines: [
        {
          speaker: "narrator",
          text: "Esther went to the king too soon. The king did not save her.",
        },
        {
          speaker: "haman",
          text: "Ha! The queen failed! Now I will kill all the Jews right away!",
        },
        {
          speaker: "narrator",
          text: "Haman killed the Jews at once. All the Jews have perished.",
        },
        {
          speaker: "esther",
          text: "No… my people! I am so sorry! I went too early…",
          emotion: "cry",
        },
        {
          speaker: "esther",
          text: "Boo-hoo… please, God… I should have waited. Boo-hoo…",
          emotion: "cry",
        },
        {
          speaker: "narrator",
          text: "Esther cries in sorrow. Try again—and wait for day 3!",
        },
      ],
    },

    court_enter: {
      image: art(29),
      visual: "visual-court",
      kicker: "The king's room",
      title: "Esther sees the king",
      body: "Esther walks in. Everyone gets very quiet. Will the king be kind? Yes! He smiles at her and holds out his golden stick. That means she is safe.",
      lines: [
        {
          speaker: "narrator",
          text: "The king sees Queen Esther. He is happy she came! He holds out his golden stick so she will be safe.",
        },
        {
          speaker: "king",
          text: "Queen Esther! What do you need? Ask me anything—even half of my kingdom!",
        },
      ],
      choices: [
        {
          label: "Tell him about the danger right away",
          next: "court_too_blunt",
        },
        {
          label: "Ask the king and Haman to come to dinner",
          next: "invite_accepted",
        },
      ],
    },

    court_too_blunt: {
      image: art(29),
      visual: "visual-court",
      kicker: "The king's room",
      title: "Not yet…",
      body: "Esther tries to explain, but it is hard. The king looks confused. Mean Haman is listening nearby. Esther needs a smarter plan.",
      lines: [
        {
          speaker: "esther",
          text: "Oh king, please save my people! Someone wants to hurt us!",
        },
        {
          speaker: "king",
          text: "Who? What do you mean? Tell me more carefully, Esther.",
        },
        {
          speaker: "haman",
          text: "The queen looks tired. Maybe a nice dinner would help!",
        },
      ],
      choices: [
        {
          label: "Invite the king and Haman to dinner",
          next: "invite_accepted",
        },
      ],
    },

    invite_accepted: {
      image: art(30),
      visual: "visual-court",
      kicker: "A clever plan",
      title: "Dinner time!",
      body: "Esther has a smart idea. She will tell the truth at dinner—where the king can hear everything.",
      lines: [
        {
          speaker: "esther",
          text: "If you are happy with me, please come to a dinner I made. And please bring Haman too!",
        },
        {
          speaker: "king",
          text: "Wonderful! Tell Haman to hurry. We will go to Esther's dinner!",
        },
        {
          speaker: "haman",
          text: "Me? Invited by the queen? How special I am!",
        },
      ],
      choices: [{ label: "Go to the dinner", next: "banquet" }],
    },

    banquet: {
      image: art(32),
      visual: "visual-banquet",
      kicker: "Esther's dinner",
      title: "Tell the truth",
      body: "Food and drinks are on the table. Haman feels proud. The king looks at Esther kindly. Now Esther must be careful and brave.",
      lines: [
        {
          speaker: "king",
          text: "Esther, what do you want? Just ask, and I will give it to you.",
        },
      ],
      choices: [
        {
          label: "Yell that Haman is bad right away",
          next: "banquet_rash",
        },
        {
          label: "Speak carefully: ask for help, then point to Haman",
          next: "banquet_sly",
        },
      ],
    },

    banquet_rash: {
      image: art(41),
      visual: "visual-banquet",
      kicker: "Esther's dinner",
      title: "Too loud!",
      body: "Esther shouts. Haman gets mad. The king looks surprised. Esther needs to slow down and explain more carefully.",
      lines: [
        {
          speaker: "esther",
          text: "It is Haman! He wants to hurt me and my people!",
        },
        {
          speaker: "haman",
          text: "That is not true! I am the king's best helper!",
        },
        {
          speaker: "king",
          text: "Wait. Esther, please tell me clearly. Who would hurt you?",
        },
      ],
      choices: [
        {
          label: "Take a breath and explain carefully",
          next: "banquet_sly",
        },
      ],
    },

    banquet_sly: {
      image: art(43),
      visual: "visual-banquet",
      kicker: "The big moment",
      title: "Esther tells the truth",
      body: "Esther speaks softly and clearly. Haman's face turns scared.",
      lines: [
        {
          speaker: "esther",
          text: "If you care about me, please save my life—and save my people too.",
        },
        {
          speaker: "esther",
          text: "Someone sold us. They want to destroy us and make us die.",
        },
        {
          speaker: "king",
          text: "Who would dare do that? Where is he?",
        },
        {
          speaker: "esther",
          text: "Our enemy is this wicked man—Haman!",
        },
        {
          speaker: "haman",
          text: "No, my king! Wait! I only wanted to help you!",
        },
        {
          speaker: "king",
          text: "Haman tried to hurt the queen! Take him away!",
        },
      ],
      choices: [{ label: "See what happens", next: "victory" }],
    },

    victory: {
      ending: "victory",
      image: art(47),
      title: "You did it!",
      body: "Haman's bad plan is stopped. The king saves Esther's people. Waiting, being brave, and telling the truth helped everyone!",
      lines: [
        {
          speaker: "narrator",
          text: "Esther was brave. She waited, then told the truth. God helped her save her people. Great job!",
        },
      ],
    },
  };

  function preferLang(voices) {
    const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
    return en.length ? en : voices;
  }

  function scoreFemale(name) {
    const n = name.toLowerCase();
    if (/zira|samantha|karen|moira|tessa|fiona|victoria|susan|hazel|eva|linda|heather|catherine|serena|jenny|aria|sara|sonia|natasha|michelle|emma|ava|woman|female/.test(n)) {
      return 3;
    }
    if (/google.*female|microsoft.*(zira|jenny|aria|sara|sonia)/.test(n)) return 3;
    return 0;
  }

  /** Soft, glamorous queen voices for Esther */
  function scoreEstherVoice(name) {
    const n = name.toLowerCase();
    if (/samantha|aria|serena|sonia|jenny|natasha|ava|michelle|emma|victoria|eva|moira|fiona/.test(n)) {
      return 10;
    }
    if (/google uk english female|microsoft.*(aria|jenny|sonia|sara)/.test(n)) return 9;
    if (/zira|karen|susan|hazel|linda|heather|catherine|tessa/.test(n)) return 5;
    if (scoreFemale(name) > 0) return 3;
    return 0;
  }

  /** Prefer a real “storyteller / narrator” voice when the device has one */
  function scoreStoryteller(name) {
    const n = name.toLowerCase();
    if (/storyteller|story teller|narrator/.test(n)) return 12;
    if (/hazel|george|daniel|british|uk english|catherine|martha|ravi|steffan|ryan/.test(n)) {
      return 8;
    }
    if (/microsoft.*(guy|davis|jason|tony)|google uk english male/.test(n)) return 6;
    return 0;
  }

  function scoreMale(name) {
    const n = name.toLowerCase();
    if (/david|mark|daniel|george|james|thomas|ravi|guy|ryan|eric|sam|fred|andrew|male|man/.test(n)) {
      return 3;
    }
    if (/google.*male|microsoft.*(david|mark|guy|ryan|andrew)/.test(n)) return 3;
    return 0;
  }

  function voiceHint(voice) {
    const female = scoreFemale(voice.name) > 0;
    const male = scoreMale(voice.name) > 0;
    const story = scoreStoryteller(voice.name) >= 8;
    const glam = scoreEstherVoice(voice.name) >= 9;
    if (story) return " · storyteller";
    if (glam) return " · soft queen";
    if (female && !male) return " · girl/woman";
    if (male && !female) return " · man";
    return "";
  }

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function savePrefs() {
    const prefs = {};
    for (const role of Object.keys(voiceCast)) {
      if (voiceCast[role]) prefs[role] = voiceCast[role].voiceURI;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  function findVoiceByUri(uri) {
    return state.availableVoices.find((v) => v.voiceURI === uri) || null;
  }

  function findVoiceMatch(patterns) {
    const list = state.availableVoices;
    for (const pattern of patterns) {
      const hit = list.find((v) => pattern.test(v.name));
      if (hit) return hit;
    }
    return null;
  }

  function pickDefaults() {
    const all = state.availableVoices;
    if (!all.length) return;

    const females = all.filter((v) => scoreFemale(v.name) > 0 || scoreEstherVoice(v.name) > 0);
    const males = all.filter((v) => scoreMale(v.name) > 0);
    const unknown = all.filter((v) => scoreFemale(v.name) === 0 && scoreMale(v.name) === 0);

    // Esther: warm, glamorous female voice
    const estherPool = [...all].sort((a, b) => scoreEstherVoice(b.name) - scoreEstherVoice(a.name));
    voiceCast.esther =
      estherPool.find((v) => scoreEstherVoice(v.name) > 0) ||
      females[0] ||
      unknown[0] ||
      all[0];

    // King: Microsoft James (or any James)
    voiceCast.king =
      findVoiceMatch([/microsoft\s*james/i, /\bjames\b/i]) ||
      [...(males.length ? males : all)].sort((a, b) => scoreMale(b.name) - scoreMale(a.name))[0] ||
      all[0];

    // Haman: Microsoft William
    voiceCast.haman =
      findVoiceMatch([/microsoft\s*william/i, /\bwilliam\b/i]) ||
      (males.length ? males : all).find((v) => v.voiceURI !== voiceCast.king?.voiceURI) ||
      voiceCast.king;

    // Storyteller: prefer a narrator/storyteller voice, never reuse Esther
    const used = new Set(
      [voiceCast.esther, voiceCast.king, voiceCast.haman]
        .filter(Boolean)
        .map((v) => v.voiceURI)
    );
    const unused = (list) => list.filter((v) => !used.has(v.voiceURI));

    const storyRanked = unused(all).sort(
      (a, b) => scoreStoryteller(b.name) - scoreStoryteller(a.name)
    );

    voiceCast.narrator =
      storyRanked.find((v) => scoreStoryteller(v.name) > 0) ||
      unused(unknown)[0] ||
      unused(males)[0] ||
      unused(females)[0] ||
      unused(all)[0] ||
      all.find((v) => !used.has(v.voiceURI)) ||
      all[all.length - 1] ||
      all[0];
  }

  function applySavedOrDefaults() {
    if (!state.availableVoices.length) return;
    pickDefaults();
    const prefs = loadPrefs();
    for (const role of Object.keys(voiceCast)) {
      // Always lock King → James and Haman → William when those voices exist
      if (role === "king" || role === "haman") continue;
      if (prefs[role]) {
        const saved = findVoiceByUri(prefs[role]);
        if (saved) voiceCast[role] = saved;
      }
    }
    // Re-assert requested male voices after prefs load
    const james = findVoiceMatch([/microsoft\s*james/i, /\bjames\b/i]);
    const william = findVoiceMatch([/microsoft\s*william/i, /\bwilliam\b/i]);
    if (james) voiceCast.king = james;
    if (william) voiceCast.haman = william;
    ensureNarratorDistinct();
    savePrefs();
  }

  function ensureNarratorDistinct() {
    const used = new Set(
      [voiceCast.esther, voiceCast.king, voiceCast.haman]
        .filter(Boolean)
        .map((v) => v.voiceURI)
    );
    const storyScore = voiceCast.narrator ? scoreStoryteller(voiceCast.narrator.name) : 0;
    if (voiceCast.narrator && !used.has(voiceCast.narrator.voiceURI) && storyScore > 0) {
      return;
    }
    const unused = state.availableVoices
      .filter((v) => !used.has(v.voiceURI))
      .sort((a, b) => scoreStoryteller(b.name) - scoreStoryteller(a.name));
    if (unused.length) voiceCast.narrator = unused[0];
  }

  function fillVoiceSelects() {
    const voices = state.availableVoices;
    for (const [role, select] of Object.entries(el.voiceSelects)) {
      if (!select) continue;
      const current = voiceCast[role]?.voiceURI;
      select.innerHTML = "";

      if (!voices.length) {
        const opt = document.createElement("option");
        opt.textContent = "No voices found on this device";
        select.appendChild(opt);
        select.disabled = true;
        continue;
      }

      select.disabled = false;
      voices.forEach((voice) => {
        const opt = document.createElement("option");
        opt.value = voice.voiceURI;
        opt.textContent = `${voice.name}${voiceHint(voice)} (${voice.lang})`;
        if (voice.voiceURI === current) opt.selected = true;
        select.appendChild(opt);
      });
    }
  }

  function refreshVoices() {
    if (!window.speechSynthesis) return;
    state.availableVoices = preferLang(window.speechSynthesis.getVoices());
    applySavedOrDefaults();
    fillVoiceSelects();
  }

  function stopSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function rateFor(role, emotion) {
    if (emotion === "cry" && role === "esther") return 0.52;
    if (role === "esther") return 0.62;
    if (role === "king") return 0.65;
    if (role === "haman") return 0.72;
    if (role === "narrator") return 0.66;
    return 0.68;
  }

  function pitchFor(role, emotion) {
    if (emotion === "cry" && role === "esther") return 1.25;
    // Lower, warmer pitch for a more glamorous queen voice
    if (role === "esther") return 0.98;
    if (role === "king") return 0.78;
    if (role === "haman") return 0.95;
    if (role === "narrator") return 1.0;
    return 0.9;
  }

  function speakWithRole(role, text, emotion) {
    if (state.muted || !window.speechSynthesis) {
      return Promise.resolve();
    }

    stopSpeech();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = voiceCast[role];
    if (voice) utter.voice = voice;
    utter.pitch = pitchFor(role, emotion);
    utter.rate = rateFor(role, emotion);
    utter.volume = 1;

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      utter.onend = finish;
      utter.onerror = finish;
      // Fallback if a browser never fires end
      const ms = Math.max(2500, Math.ceil(text.length * 95 / utter.rate));
      window.setTimeout(finish, ms);
      window.speechSynthesis.speak(utter);
    });
  }

  function speakLine(line) {
    state.currentLine = line;
    if (!line) return Promise.resolve();
    const role = speakers[line.speaker]?.role || "narrator";
    return speakWithRole(role, line.text, line.emotion);
  }

  function buildSpokenLines(scene, body) {
    const dialogLines =
      (typeof scene.getLines === "function" ? scene.getLines() : scene.lines) || [];
    const storyText = (body || "").trim();
    const spoken = [];

    if (storyText) {
      spoken.push({
        speaker: "narrator",
        text: storyText,
        isStory: true,
      });
    }

    for (const line of dialogLines) {
      if (
        line.speaker === "narrator" &&
        storyText &&
        line.text.trim() === storyText
      ) {
        continue;
      }
      spoken.push(line);
    }

    return spoken;
  }

  async function playLines(lines, options = {}) {
    const continueBtn = options.continueBtn || el.continueBtn;
    const textTarget = options.textTarget || el.dialogText;
    const speakerTarget = options.speakerTarget || el.speakerName;
    const panel = options.panel || el.dialog;
    const gen = ++state.dialogGen;

    if (!lines?.length) {
      if (panel && panel === el.dialog) panel.hidden = true;
      if (el.continueBtn) el.continueBtn.hidden = true;
      return;
    }

    if (panel === el.dialog) {
      el.dialog.hidden = false;
      el.replayBtn.hidden = false;
    }
    if (el.continueBtn && continueBtn !== el.continueBtn) el.continueBtn.hidden = true;

    for (let i = 0; i < lines.length; i += 1) {
      if (gen !== state.dialogGen) return;

      const line = lines[i];
      const meta = speakers[line.speaker] || speakers.narrator;
      if (panel && panel.dataset) panel.dataset.speaker = meta.role;
      if (speakerTarget) {
        speakerTarget.textContent = line.isStory ? "Storyteller" : meta.label;
      }

      // Show text right away — do not wait on typing or speech
      if (textTarget) {
        textTarget.classList.remove("typing");
        textTarget.textContent = line.text;
      }
      state.currentLine = line;
      speakLine(line);

      if (continueBtn) {
        continueBtn.hidden = false;
        continueBtn.disabled = false;
        continueBtn.textContent = "Continue";
        const result = await waitForButton(continueBtn, gen);
        continueBtn.hidden = true;
        stopSpeech();
        if (result === "cancel" || gen !== state.dialogGen) return;
      }
    }
  }

  function waitForButton(button, gen) {
    return new Promise((resolve) => {
      const onClick = () => {
        cleanup();
        resolve("click");
      };
      const poll = window.setInterval(() => {
        if (gen !== state.dialogGen) {
          cleanup();
          resolve("cancel");
        }
      }, 50);
      function cleanup() {
        button.removeEventListener("click", onClick);
        window.clearInterval(poll);
      }
      button.addEventListener("click", onClick);
    });
  }

  async function showEnding(scene) {
    stopSpeech();
    state.dialogGen += 1;
    el.overlay.hidden = false;
    el.overlay.querySelector(".ending-card").classList.toggle("defeat", scene.ending === "defeat");
    el.overlay.querySelector(".ending-card").classList.toggle("victory", scene.ending === "victory");
    el.endingTitle.textContent = scene.title;
    el.endingBody.textContent = scene.body;
    el.restartBtn.hidden = false;
    if (el.endingContinue) el.endingContinue.hidden = true;
    el.dialog.hidden = true;
    if (el.continueBtn) el.continueBtn.hidden = true;

    if (scene.image && el.endingArt) {
      el.endingArt.src = scene.image;
      el.endingArt.alt = scene.title;
      el.endingArt.hidden = false;
    } else if (el.endingArt) {
      el.endingArt.hidden = true;
      el.endingArt.removeAttribute("src");
    }

    let speakerEl = el.overlay.querySelector(".ending-speaker");
    if (!speakerEl) {
      speakerEl = document.createElement("p");
      speakerEl.className = "ending-speaker";
      el.endingBody.parentNode.insertBefore(speakerEl, el.endingBody);
    }

    state.busy = false;
    await playLines(buildSpokenLines(scene, scene.body), {
      continueBtn: el.endingContinue,
      textTarget: el.endingBody,
      speakerTarget: speakerEl,
      panel: el.overlay.querySelector(".ending-card"),
    });

    if (el.endingContinue) el.endingContinue.hidden = true;
    speakerEl.textContent = "";
    el.endingBody.textContent = scene.body;
    el.restartBtn.hidden = false;
    state.busy = false;
  }

  function renderChoices(choiceList) {
    el.choices.innerHTML = "";
    choiceList.forEach((choice, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn" + (index === 0 && choiceList.length === 1 ? " primary" : "");
      btn.textContent = choice.label;
      btn.addEventListener("click", () => onChoice(choice));
      el.choices.appendChild(btn);
    });
  }

  function startMusic() {
    if (!el.bgMusic || state.musicMuted) return;
    el.bgMusic.loop = true;
    el.bgMusic.volume = MUSIC_VOLUME;
    const play = el.bgMusic.play();
    if (play && typeof play.then === "function") {
      play
        .then(() => {
          state.musicStarted = true;
        })
        .catch(() => {
          // Browsers may block until a click — try again on next tap
        });
    } else {
      state.musicStarted = true;
    }
  }

  function syncMusicButton() {
    if (!el.musicBtn) return;
    el.musicBtn.setAttribute("aria-pressed", String(state.musicMuted));
    el.musicBtn.textContent = state.musicMuted ? "Music Off" : "Music On";
  }

  async function onChoice(choice) {
    startMusic();
    state.dialogGen += 1;
    state.busy = false;
    stopSpeech();
    if (el.continueBtn) el.continueBtn.hidden = true;
    if (choice.action === "waitDay") {
      state.day = Math.min(3, state.day + 1);
      goTo("chamber");
      return;
    }
    if (choice.next) goTo(choice.next);
  }

  async function goTo(id) {
    state.dialogGen += 1;
    stopSpeech();
    const scene = scenes[id];
    if (!scene) return;

    if (scene.ending) {
      el.scene.innerHTML = "";
      el.choices.innerHTML = "";
      if (el.continueBtn) el.continueBtn.hidden = true;
      await showEnding(scene);
      return;
    }

    el.overlay.hidden = true;
    el.restartBtn.hidden = true;

    const body = typeof scene.getBody === "function" ? scene.getBody() : scene.body;
    const extra = typeof scene.getExtraHtml === "function" ? scene.getExtraHtml() : "";
    const choices = typeof scene.getChoices === "function" ? scene.getChoices() : scene.choices || [];
    const image = typeof scene.getImage === "function" ? scene.getImage() : scene.image;
    const spoken = buildSpokenLines(scene, body);

    el.scene.innerHTML = `
      <div class="scene-visual ${scene.visual || ""}" role="img" aria-label="${scene.title}">
        ${image ? `<img src="${image}" alt="${scene.title}" />` : ""}
      </div>
      <p class="scene-kicker">${scene.kicker || ""}</p>
      <h1 class="scene-title">${scene.title}</h1>
      <p class="scene-body">${body}</p>
      ${extra}
    `;

    // Choices and first dialog line are ready right away
    state.busy = false;
    renderChoices(choices);
    playLines(spoken, { continueBtn: el.continueBtn });
  }

  function restart() {
    stopSpeech();
    state.dialogGen += 1;
    state.day = 1;
    state.busy = false;
    el.overlay.hidden = true;
    el.restartBtn.hidden = true;
    if (el.endingContinue) el.endingContinue.hidden = true;
    if (el.continueBtn) el.continueBtn.hidden = true;
    goTo("title");
  }

  function openVoicePanel() {
    refreshVoices();
    fillVoiceSelects();
    el.voiceOverlay.hidden = false;
  }

  function closeVoicePanel() {
    for (const [role, select] of Object.entries(el.voiceSelects)) {
      const voice = findVoiceByUri(select.value);
      if (voice) voiceCast[role] = voice;
    }
    savePrefs();
    el.voiceOverlay.hidden = true;
    stopSpeech();
  }

  el.muteBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    el.muteBtn.setAttribute("aria-pressed", String(state.muted));
    el.muteBtn.textContent = state.muted ? "Voice Off" : "Voice On";
    if (state.muted) stopSpeech();
    else if (state.currentLine) speakLine(state.currentLine);
  });

  el.musicBtn.addEventListener("click", () => {
    state.musicMuted = !state.musicMuted;
    syncMusicButton();
    if (!el.bgMusic) return;
    if (state.musicMuted) {
      el.bgMusic.pause();
    } else {
      startMusic();
    }
  });

  // Unlock quiet looping music on the first tap anywhere
  const unlockMusic = () => {
    startMusic();
    document.removeEventListener("pointerdown", unlockMusic);
    document.removeEventListener("keydown", unlockMusic);
  };
  document.addEventListener("pointerdown", unlockMusic);
  document.addEventListener("keydown", unlockMusic);

  if (el.bgMusic) {
    el.bgMusic.loop = true;
    el.bgMusic.volume = MUSIC_VOLUME;
  }
  syncMusicButton();

  el.voicesBtn.addEventListener("click", openVoicePanel);
  el.voiceDone.addEventListener("click", closeVoicePanel);

  el.voiceReset.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    pickDefaults();
    fillVoiceSelects();
    savePrefs();
  });

  el.voiceOverlay.addEventListener("click", (event) => {
    if (event.target === el.voiceOverlay) closeVoicePanel();
  });

  document.querySelectorAll(".preview-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const role = btn.getAttribute("data-role");
      const select = el.voiceSelects[role];
      const voice = findVoiceByUri(select.value);
      if (voice) voiceCast[role] = voice;
      const wasMuted = state.muted;
      state.muted = false;
      speakWithRole(role, PREVIEW_LINES[role] || "Hello!");
      state.muted = wasMuted;
    });
  });

  for (const [role, select] of Object.entries(el.voiceSelects)) {
    select.addEventListener("change", () => {
      const voice = findVoiceByUri(select.value);
      if (voice) {
        voiceCast[role] = voice;
        savePrefs();
      }
    });
  }

  el.replayBtn.addEventListener("click", () => {
    if (state.currentLine) speakLine(state.currentLine);
  });

  el.restartBtn.addEventListener("click", restart);

  if (window.speechSynthesis) {
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  }

  goTo("title");
})();
