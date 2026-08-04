(() => {
  "use strict";

  const STORAGE_KEY = "esther-voice-prefs-v4";

  const speakers = {
    narrator: { label: "Storyteller", role: "narrator" },
    esther: { label: "Esther", role: "esther" },
    king: { label: "The King", role: "king" },
    haman: { label: "Haman", role: "haman" },
  };

  const PREVIEW_LINES = {
    esther: "I am Queen Esther. May I speak with grace and kindness?",
    king: "I am the king. What do you need?",
    haman: "I am Haman. Everyone should bow to me!",
    narrator: "Once upon a time, Queen Esther had to be brave and wise.",
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
    dialogGen: 0,
    speechToken: 0,
    availableVoices: /** @type {SpeechSynthesisVoice[]} */ ([]),
  };

  const MUSIC_VOLUME = 0.06;
  const ART = "FB_GSI_Esther_JPEGW";

  const el = {
    scene: document.getElementById("scene"),
    dialog: document.getElementById("dialog"),
    speakerName: document.getElementById("speaker-name"),
    dialogText: document.getElementById("dialog-text"),
    choices: document.getElementById("choices"),
    muteBtn: document.getElementById("mute-btn"),
    musicBtn: document.getElementById("music-btn"),
    bgMusic: document.getElementById("bg-music"),
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

  function art(n) {
    const id = String(n).padStart(2, "0");
    return `${ART}/${id}_FB_GSI_Esther_1920.jpg`;
  }

  // Portraits used when a character speaks on lose/win screens
  const SPEAKER_ART = {
    esther: art(25),
    king: art(1),
    haman: art(21),
  };

  function artForSpeaker(speaker, fallback) {
    return SPEAKER_ART[speaker] || fallback || art(24);
  }

  function setEndingArt(src, alt) {
    if (!el.endingArt) return;
    if (!src) {
      el.endingArt.hidden = true;
      el.endingArt.removeAttribute("src");
      return;
    }
    el.endingArt.src = src;
    el.endingArt.alt = alt || "";
    el.endingArt.hidden = false;
  }

  function setEndingSpeakerLabel(line) {
    let speakerEl = el.overlay.querySelector(".ending-speaker");
    if (!speakerEl) {
      speakerEl = document.createElement("p");
      speakerEl.className = "ending-speaker";
      el.endingBody.parentNode.insertBefore(speakerEl, el.endingBody);
    }
    if (!line) {
      speakerEl.textContent = "";
      speakerEl.hidden = true;
      return;
    }
    const meta = speakers[line.speaker] || speakers.narrator;
    speakerEl.textContent = meta.label;
    speakerEl.hidden = false;
  }

  async function playEndingLine(line, fallbackImage) {
    if (!line) return;
    const meta = speakers[line.speaker] || speakers.narrator;
    setEndingArt(artForSpeaker(line.speaker, fallbackImage), meta.label);
    setEndingSpeakerLabel(line);
    el.endingBody.textContent = line.text;
    await speakLine(line);
  }

  function failEnding(overrides) {
    return {
      ending: "defeat",
      image: art(24),
      title: "Oh no!",
      speak: true,
      ...overrides,
    };
  }

  function rudeFail(overrides) {
    return failEnding({
      title: "Too rude!",
      ...overrides,
    });
  }

  const scenes = {
    title: {
      image: art(11),
      kicker: "A Bible story game",
      title: "Into the King's Court",
      body: "Help Queen Esther be brave and graceful. She must fast and seek the Lord’s help to save her people. If she is rude, she will lose. Invite the king and Haman to dinner, and tell the truth with kindness. (Speech uses system voices—best in Microsoft Edge on Windows.)",
      line: {
        speaker: "narrator",
        text: "Queen Esther needs the Lord’s help to save her people. She must fast, be graceful—not rude—or she will lose!",
      },
      choices: [{ label: "Let's play!", next: "chamber" }],
    },

    chamber: {
      getImage: () => (state.day === 1 ? art(25) : state.day === 2 ? art(27) : art(28)),
      kicker: "Esther's room",
      title: "Fast three days",
      getBody: () =>
        state.day === 1
          ? "Esther fasts and asks the Lord for help. Only God can save her people. Going to the king too soon is dangerous."
          : state.day === 2
            ? "Day 2 of fasting. Mordecai warns her: Haman wants to hurt God’s people. Keep fasting and pray for the Lord’s help."
            : "Day 3 of fasting. Esther trusts the Lord, dresses with grace, and is ready to go to the king.",
      getExtraHtml: () => `
        <div class="day-meter" aria-label="Day ${state.day} of 3">
          <span class="day-pip ${state.day >= 1 ? "filled" : ""}"></span>
          <span class="day-pip ${state.day >= 2 ? "filled" : ""}"></span>
          <span class="day-pip ${state.day >= 3 ? "filled" : ""}"></span>
        </div>
      `,
      getLine: () => {
        if (state.day === 1) {
          return {
            speaker: "esther",
            text: "I will fast and seek the Lord. Without His help, I cannot save my people.",
          };
        }
        if (state.day === 2) {
          return {
            speaker: "esther",
            text: "One more day of fasting. Please, Lord, help me save my people. Make me brave and gentle.",
          };
        }
        return {
          speaker: "esther",
          text: "I have fasted, and I trust the Lord. Today I will go with grace. If I die, I die.",
        };
      },
      getChoices: () => {
        const choices = [
          {
            label: state.day >= 3 ? "Enter the court with grace" : "Rush in right now",
            next: state.day >= 3 ? "court_enter" : "death_early",
          },
        ];
        if (state.day < 3) {
          choices.unshift({
            label: "Keep fasting and seek the Lord’s help",
            action: "waitDay",
          });
          if (state.day === 1) {
            choices.push({
              label: "Ask Haman for help instead of the Lord",
              next: "death_trust_haman",
            });
          }
        }
        return choices;
      },
    },

    death_early: failEnding({
      body: "Esther did not finish fasting or seek the Lord’s help. She rushed in too early. Haman killed the Jews, and Esther weeps.",
      line: {
        speaker: "esther",
        text: "I should have fasted and trusted the Lord. My people… I am so sorry.",
        emotion: "cry",
      },
      after: {
        speaker: "haman",
        text: "The queen failed! I will destroy the Jews right away!",
      },
    }),

    death_trust_haman: failEnding({
      image: art(21),
      body: "Esther asked mean Haman for help instead of the Lord. He lied, then hurt her people at once.",
      line: {
        speaker: "haman",
        text: "Help you? Ha! Now the Jews will perish!",
      },
      after: {
        speaker: "esther",
        text: "I should have sought the Lord… My people…",
        emotion: "cry",
      },
    }),

    court_enter: {
      image: art(29),
      kicker: "The king's room",
      title: "Before the king",
      body: "Esther enters with grace, trusting the Lord. The king holds out his golden stick. She is safe.",
      line: {
        speaker: "king",
        text: "Queen Esther, what do you wish? Ask me anything—even half my kingdom!",
      },
      choices: [
        {
          label: "Gracefully invite the king and Haman to dinner",
          next: "invite_accepted",
        },
        {
          label: "Be rude and demand he save everyone now",
          next: "death_demand",
        },
        {
          label: "Be rude: point at Haman and shout",
          next: "death_shout_court",
        },
      ],
    },

    death_demand: rudeFail({
      image: art(29),
      body: "Esther was rude to the king. Because she was rude, she lost. Haman’s plan went forward, and the Jews were not saved.",
      line: {
        speaker: "king",
        text: "That is rude! A queen does not speak to me that way. Leave!",
      },
      after: {
        speaker: "haman",
        text: "She was rude—and now I win. The Jews will perish!",
      },
    }),

    death_shout_court: rudeFail({
      image: art(30),
      body: "Esther was rude and shouted in court. Because she was rude, she lost. The king did not trust her.",
      line: {
        speaker: "haman",
        text: "See how rude she is? Do not listen to her!",
      },
      after: {
        speaker: "esther",
        text: "I was rude… and my people are lost.",
        emotion: "cry",
      },
    }),

    invite_accepted: {
      image: art(30),
      kicker: "A graceful plan",
      title: "Dinner invitation",
      body: "Esther bows and invites them kindly. Soft words can open hard hearts. Rudeness would ruin everything.",
      line: {
        speaker: "esther",
        text: "If it please the king, come to the dinner I have prepared—and bring Haman too.",
      },
      choices: [
        { label: "Go to the dinner", next: "banquet" },
        {
          label: "Be rude and snap at the king",
          next: "death_rude_invite",
        },
        {
          label: "Be rude: accuse Haman in the hallway",
          next: "death_hallway",
        },
      ],
    },

    death_rude_invite: rudeFail({
      image: art(30),
      body: "Esther snapped at the king. Because she was rude, she lost. Haman struck while the king was angry.",
      line: {
        speaker: "esther",
        text: "Just come to dinner—hurry up!",
      },
      after: {
        speaker: "king",
        text: "How rude! I will not listen to you.",
      },
    }),

    death_hallway: rudeFail({
      image: art(27),
      body: "Esther was rude and accused Haman in the hallway. Because she was rude, she lost.",
      line: {
        speaker: "haman",
        text: "Seize her! The Jews will perish today!",
      },
      after: {
        speaker: "esther",
        text: "I should have been graceful…",
        emotion: "cry",
      },
    }),

    banquet: {
      image: art(32),
      kicker: "Esther's dinner",
      title: "Speak with grace",
      body: "At the table, Esther must be brave and graceful. With the Lord’s help, soft truth can save her people. If she is rude, she will lose.",
      line: {
        speaker: "king",
        text: "Esther, what is your request? It shall be given to you.",
      },
      choices: [
        {
          label: "Gracefully ask for her life, then name Haman",
          next: "banquet_grace",
        },
        {
          label: "Be rude and yell that Haman is bad",
          next: "death_yell_dinner",
        },
        {
          label: "Say nothing and hope it goes away",
          next: "death_silence",
        },
      ],
    },

    death_yell_dinner: rudeFail({
      image: art(41),
      body: "Esther was rude and yelled at dinner. Because she was rude, she lost. The king did not save her people.",
      line: {
        speaker: "king",
        text: "That is rude! I will hear no more tonight.",
      },
      after: {
        speaker: "esther",
        text: "If only I had spoken with grace…",
        emotion: "cry",
      },
    }),

    death_silence: failEnding({
      image: art(40),
      body: "Esther stayed silent. Haman’s plan kept going. Saying nothing did not protect her people.",
      line: {
        speaker: "haman",
        text: "See? Even the queen has nothing to say. The decree stands!",
      },
      after: {
        speaker: "esther",
        text: "I was afraid to speak… and now it is too late.",
        emotion: "cry",
      },
    }),

    banquet_grace: {
      image: art(43),
      kicker: "The truth",
      title: "A graceful reveal",
      body: "Esther speaks softly and clearly, trusting the Lord to help save her people. The king listens. Haman’s smile falls away.",
      line: {
        speaker: "esther",
        text: "If I have found favor, spare my life and my people. Our enemy is this wicked Haman.",
      },
      choices: [{ label: "See what happens", next: "victory" }],
    },

    victory: {
      ending: "victory",
      image: art(47),
      title: "You did it!",
      body: "Because Esther fasted, sought the Lord’s help, spoke with grace—not rudeness—and told the truth, her people were saved.",
      line: {
        speaker: "narrator",
        text: "The Lord helped Esther save her people. Grace and faith won. Great job!",
      },
      speak: true,
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
    return 0;
  }

  function scoreEstherVoice(name) {
    const n = name.toLowerCase();
    if (/samantha|aria|serena|sonia|jenny|natasha|ava|michelle|emma|victoria|eva|moira|fiona/.test(n)) {
      return 10;
    }
    if (/microsoft.*(aria|jenny|sonia|sara)|google uk english female/.test(n)) return 9;
    if (/zira|karen|susan|hazel|linda|heather|catherine|tessa/.test(n)) return 5;
    if (scoreFemale(name) > 0) return 3;
    return 0;
  }

  function scoreStoryteller(name) {
    const n = name.toLowerCase();
    if (/storyteller|story teller|narrator/.test(n)) return 12;
    if (/hazel|george|daniel|british|uk english|catherine|martha|ravi|steffan/.test(n)) {
      return 8;
    }
    return 0;
  }

  function scoreMale(name) {
    const n = name.toLowerCase();
    if (/david|mark|daniel|george|james|thomas|ravi|guy|ryan|eric|sam|fred|andrew|william|male|man/.test(n)) {
      return 3;
    }
    return 0;
  }

  function voiceHint(voice) {
    const female = scoreFemale(voice.name) > 0;
    const male = scoreMale(voice.name) > 0;
    if (scoreStoryteller(voice.name) >= 8) return " · storyteller";
    if (scoreEstherVoice(voice.name) >= 9) return " · soft queen";
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
    for (const pattern of patterns) {
      const hit = state.availableVoices.find((v) => pattern.test(v.name));
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

    const estherPool = [...all].sort((a, b) => scoreEstherVoice(b.name) - scoreEstherVoice(a.name));
    voiceCast.esther =
      estherPool.find((v) => scoreEstherVoice(v.name) > 0) ||
      females[0] ||
      unknown[0] ||
      all[0];

    voiceCast.king =
      findVoiceMatch([/microsoft\s*james/i, /\bjames\b/i]) ||
      [...(males.length ? males : all)].sort((a, b) => scoreMale(b.name) - scoreMale(a.name))[0] ||
      all[0];

    voiceCast.haman =
      findVoiceMatch([/microsoft\s*william/i, /\bwilliam\b/i]) ||
      (males.length ? males : all).find((v) => v.voiceURI !== voiceCast.king?.voiceURI) ||
      voiceCast.king;

    const used = new Set(
      [voiceCast.esther, voiceCast.king, voiceCast.haman].filter(Boolean).map((v) => v.voiceURI)
    );
    const unused = all.filter((v) => !used.has(v.voiceURI));
    unused.sort((a, b) => scoreStoryteller(b.name) - scoreStoryteller(a.name));
    voiceCast.narrator =
      unused.find((v) => scoreStoryteller(v.name) > 0) ||
      unused[0] ||
      all[all.length - 1] ||
      all[0];
  }

  function applySavedOrDefaults() {
    if (!state.availableVoices.length) return;
    pickDefaults();
    const prefs = loadPrefs();
    for (const role of Object.keys(voiceCast)) {
      if (role === "king" || role === "haman") continue;
      if (prefs[role]) {
        const saved = findVoiceByUri(prefs[role]);
        if (saved) voiceCast[role] = saved;
      }
    }
    const james = findVoiceMatch([/microsoft\s*james/i, /\bjames\b/i]);
    const william = findVoiceMatch([/microsoft\s*william/i, /\bwilliam\b/i]);
    if (james) voiceCast.king = james;
    if (william) voiceCast.haman = william;
    savePrefs();
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
    if (!state.availableVoices.length) return;
    applySavedOrDefaults();
    fillVoiceSelects();
  }

  function stopSpeech() {
    state.speechToken += 1;
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
    } catch (_) {
      /* ignore */
    }
  }

  function rateFor(role, emotion) {
    if (emotion === "cry" && role === "esther") return 0.85;
    if (role === "esther") return 0.98;
    if (role === "king") return 0.9;
    if (role === "haman") return 0.95;
    if (role === "narrator") return 0.92;
    return 0.95;
  }

  function pitchFor(role, emotion) {
    if (emotion === "cry" && role === "esther") return 1.15;
    if (role === "esther") return 1.05;
    if (role === "king") return 0.8;
    if (role === "haman") return 0.95;
    if (role === "narrator") return 1.0;
    return 1.0;
  }

  function resolveVoice(role) {
    let voice = voiceCast[role];
    if (voice && state.availableVoices.some((v) => v.voiceURI === voice.voiceURI)) {
      return voice;
    }
    // Voice objects can go stale after voiceschanged — refresh from URI/name
    if (voice) {
      const again =
        findVoiceByUri(voice.voiceURI) ||
        state.availableVoices.find((v) => v.name === voice.name);
      if (again) {
        voiceCast[role] = again;
        return again;
      }
    }
    refreshVoices();
    return voiceCast[role];
  }

  function speakWithRole(role, text, emotion) {
    if (state.muted || !window.speechSynthesis || !text) {
      return Promise.resolve();
    }

    const token = ++state.speechToken;
    try {
      window.speechSynthesis.cancel();
    } catch (_) {
      /* ignore */
    }

    return new Promise((resolve) => {
      // Small delay avoids Chrome dropping speech after cancel()
      window.setTimeout(() => {
        if (token !== state.speechToken || state.muted) {
          resolve();
          return;
        }

        if (!state.availableVoices.length) refreshVoices();

        const utter = new SpeechSynthesisUtterance(text);
        const voice = resolveVoice(role);
        if (voice) {
          utter.voice = voice;
          utter.lang = voice.lang || "en-US";
        } else {
          utter.lang = "en-US";
        }
        utter.pitch = pitchFor(role, emotion);
        utter.rate = rateFor(role, emotion);
        utter.volume = 1;

        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          resolve();
        };

        utter.onend = finish;
        utter.onerror = finish;

        try {
          window.speechSynthesis.speak(utter);
          // Chrome sometimes starts paused — nudge it
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (_) {
          finish();
        }

        const ms = Math.max(2000, Math.ceil((text.length / 12) * 1000 / utter.rate) + 800);
        window.setTimeout(finish, ms);
      }, 60);
    });
  }

  function speakLine(line) {
    if (!line) return Promise.resolve();
    state.currentLine = line;
    const role = speakers[line.speaker]?.role || "narrator";
    return speakWithRole(role, line.text, line.emotion);
  }

  function showDialog(line) {
    if (!line) {
      el.dialog.hidden = true;
      return;
    }
    const meta = speakers[line.speaker] || speakers.narrator;
    el.dialog.hidden = false;
    el.dialog.dataset.speaker = meta.role;
    el.speakerName.textContent = meta.label;
    el.dialogText.textContent = line.text;
    el.replayBtn.hidden = false;
    speakLine(line);
  }

  function renderChoices(choiceList) {
    el.choices.innerHTML = "";
    (choiceList || []).forEach((choice, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn" + (choiceList.length === 1 ? " primary" : "");
      if (index === 0 && choiceList.length > 1) btn.classList.add("primary");
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
      play.then(() => {
        state.musicStarted = true;
      }).catch(() => {});
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
    stopSpeech();
    if (choice.action === "waitDay") {
      state.day = Math.min(3, state.day + 1);
      goTo("chamber");
      return;
    }
    if (choice.next) goTo(choice.next);
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
    el.dialog.hidden = true;
    el.choices.innerHTML = "";

    setEndingArt(scene.image, scene.title);
    setEndingSpeakerLabel(null);

    // Each spoken line swaps the art to that speaker
    if (scene.line) await playEndingLine(scene.line, scene.image);
    if (scene.after) await playEndingLine(scene.after, scene.image);

    // Return to summary text after dialogue
    setEndingSpeakerLabel(null);
    el.endingBody.textContent = scene.body;
    setEndingArt(scene.image, scene.title);
  }

  async function goTo(id) {
    state.dialogGen += 1;
    stopSpeech();
    const scene = scenes[id];
    if (!scene) return;

    if (scene.ending) {
      el.scene.innerHTML = "";
      el.choices.innerHTML = "";
      await showEnding(scene);
      return;
    }

    el.overlay.hidden = true;
    el.restartBtn.hidden = true;

    const body = typeof scene.getBody === "function" ? scene.getBody() : scene.body;
    const extra = typeof scene.getExtraHtml === "function" ? scene.getExtraHtml() : "";
    const choices = typeof scene.getChoices === "function" ? scene.getChoices() : scene.choices || [];
    const image = typeof scene.getImage === "function" ? scene.getImage() : scene.image;
    const line = typeof scene.getLine === "function" ? scene.getLine() : scene.line;

    el.scene.innerHTML = `
      <div class="scene-visual" role="img" aria-label="${scene.title}">
        ${image ? `<img src="${image}" alt="" />` : ""}
      </div>
      <p class="scene-kicker">${scene.kicker || ""}</p>
      <h1 class="scene-title">${scene.title}</h1>
      <p class="scene-body">${body || ""}</p>
      ${extra}
    `;

    renderChoices(choices);
    showDialog(line);
  }

  function restart() {
    stopSpeech();
    state.dialogGen += 1;
    state.day = 1;
    el.overlay.hidden = true;
    el.restartBtn.hidden = true;
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
    if (state.currentLine) speakLine(state.currentLine);
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
    if (state.musicMuted) el.bgMusic.pause();
    else startMusic();
  });

  const unlockAudio = () => {
    startMusic();
    // Unlock speech on first gesture (required by some browsers)
    if (window.speechSynthesis) {
      const warm = new SpeechSynthesisUtterance("");
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
      window.speechSynthesis.cancel();
    }
    document.removeEventListener("pointerdown", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
  };
  document.addEventListener("pointerdown", unlockAudio);
  document.addEventListener("keydown", unlockAudio);

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

  // Keep Chrome speech from getting stuck paused
  window.setInterval(() => {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
      } catch (_) {
        /* ignore */
      }
    }
  }, 250);

  if (window.speechSynthesis) {
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    // Some browsers populate voices late
    window.setTimeout(refreshVoices, 250);
    window.setTimeout(refreshVoices, 1000);
  }

  goTo("title");
})();
