(function () {
  const list = window.TREKI || [];
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  let current = -1;

  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + String(r).padStart(2, "0");
  };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hasAudio = (i) => list[i] && list[i].audio !== false;

  $("tracks").innerHTML = list.map((c, i) => `${c.part && (i === 0 || list[i - 1].part !== c.part) ? `
    <li class="part-title" aria-hidden="false"><span>${esc(c.part)}</span></li>` : ""}
    <li class="track${c.audio === false ? " soon" : ""}" data-i="${i}">
      <button class="tplay" type="button" aria-label="Слушать «${esc(c.title)}»">${String(i + 1).padStart(2, "0")}</button>
      <div class="tmeta">
        <span class="ttitle">${esc(c.title)}${c.song ? ' <span class="tag">песня</span>' : ""}</span>
        <span class="tscene">${esc([c.chapter, c.scene].filter(Boolean).join(" · "))}</span>
      </div>
      <span class="tdur">${c.audio === false ? "скоро" : esc(c.duration || "")}</span>
    </li>`).join("");

  function showScene(i) {
    const c = list[i];
    $("scene").hidden = false;
    const img = $("sceneImg");
    img.hidden = false;
    img.onerror = () => { img.hidden = true; };
    img.src = "assets/img/" + c.img;
    $("sceneImg").alt = "Иллюстрация: " + (c.scene || c.title);
    $("sceneMeta").textContent = [c.chapter, c.scene].filter(Boolean).join(" · ");
    $("sceneTitle").textContent = c.title;
    $("sceneQuote").hidden = !c.quote;
    $("sceneQuote").innerHTML = (c.quote || "").split("\n").map(esc).join("<br>");
    showLyrics(c);
  }

  // Текст песни (только для песен со словами): строфы через пустую строку, [Припев] — припев
  async function showLyrics(c) {
    const box = $("lyrics");
    box.hidden = true;
    if (!c.song) return;
    try {
      const r = await fetch("teksty/" + c.id + ".md");
      if (!r.ok) return;
      const txt = (await r.text()).replace(/^#.*$/m, "").trim();
      $("lyricsBody").innerHTML = txt.split(/\n\s*\n/).map((st) => {
        const lines = st.split("\n").map((l) => esc(l.trim()));
        const chorus = /^\[Припев\]$/.test(lines[0]);
        if (chorus) lines.shift();
        return `<p class="${chorus ? "chorus" : ""}">${chorus ? '<span class="label">Припев</span>' : ""}${lines.join("<br>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</p>`;
      }).join("");
      if (list[current] === c) box.hidden = false;
    } catch (e) { /* открыто как файл */ }
  }

  function play(i) {
    if (i < 0 || i >= list.length) return;
    current = i;
    showScene(i);
    $("player").hidden = false;
    if (!hasAudio(i)) {
      if (!audio.paused) audio.pause();
      audio.removeAttribute("src");
      $("nowTitle").textContent = list[i].title + " — запись скоро";
      sync();
      return;
    }
    const src = "audio/" + list[i].id + ".mp3";
    if (!audio.src.endsWith(src)) audio.src = src;
    audio.play();
    $("nowTitle").textContent = list[i].title;
  }

  function nextWithAudio(from) {
    let n = from + 1;
    while (n < list.length && !hasAudio(n)) n++;
    return n < list.length ? n : -1;
  }

  function sync() {
    const playing = !audio.paused;
    document.body.classList.toggle("is-playing", playing);
    $("toggle").textContent = playing ? "⏸" : "▶";
    document.querySelectorAll(".track").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.i) === current);
      el.classList.toggle("playing", Number(el.dataset.i) === current && playing);
    });
  }

  $("tracks").addEventListener("click", (e) => {
    const li = e.target.closest(".track");
    if (!li) return;
    const i = Number(li.dataset.i);
    if (i === current && !audio.paused) audio.pause(); else play(i);
  });
  $("playAll").addEventListener("click", () => {
    const first = hasAudio(0) ? 0 : nextWithAudio(0);
    play(first < 0 ? 0 : first);
    $("scene").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("toggle").addEventListener("click", () => (audio.paused ? play(current < 0 ? 0 : current) : audio.pause()));
  $("prev").addEventListener("click", () => (audio.currentTime > 3 ? (audio.currentTime = 0) : play(Math.max(0, current - 1))));
  $("next").addEventListener("click", () => play(Math.min(list.length - 1, current + 1)));

  audio.addEventListener("play", sync);
  audio.addEventListener("pause", sync);
  audio.addEventListener("ended", () => { const n = nextWithAudio(current); if (n >= 0) play(n); else sync(); });
  audio.addEventListener("timeupdate", () => {
    $("time").textContent = fmt(audio.currentTime);
    if (audio.duration) $("seek").value = (audio.currentTime / audio.duration) * 100;
  });
  $("seek").addEventListener("input", (e) => {
    if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
  });
})();
