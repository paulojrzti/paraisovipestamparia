/* ═══════════════════════════════════════════════════════════════
   Paraíso VIP Estamparia — Landing page de conversão
════════════════════════════════════════════════════════════════ */

const WHATSAPP_LINK =
  "https://wa.me/5500000000000?text=Oi%2C%20quero%20um%20or%C3%A7amento%20da%20Para%C3%ADso%20VIP%20Estamparia";

const IMAGE_FALLBACK = "assets/placeholder-real.svg";

/* ── Links WhatsApp ──────────────────────────────────────────── */
document.querySelectorAll(".js-whatsapp-link").forEach((el) => {
  el.setAttribute("href", WHATSAPP_LINK);
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener noreferrer");
});

/* ── Scroll reveal ───────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));


/* ── Carousel ────────────────────────────────────────────────── */
(function () {
  const track   = document.getElementById("carouselTrack");
  const dotsWrap = document.getElementById("carDots");
  const btnPrev  = document.querySelector(".car-prev");
  const btnNext  = document.querySelector(".car-next");

  if (!track) return;

  const items = track.querySelectorAll(".sh-item");
  const total = items.length;

  /* Cria os dots */
  items.forEach((_, i) => {
    const d = document.createElement("button");
    d.className = "car-dot" + (i === 0 ? " active" : "");
    d.setAttribute("aria-label", "Ir para item " + (i + 1));
    d.addEventListener("click", () => scrollTo(i));
    dotsWrap.appendChild(d);
  });

  const dots = () => dotsWrap.querySelectorAll(".car-dot");

  function getIndex() {
    const itemW = items[0].offsetWidth + 14; /* width + gap */
    return Math.round(track.scrollLeft / itemW);
  }

  function scrollTo(index) {
    const itemW = items[0].offsetWidth + 14;
    track.scrollTo({ left: index * itemW, behavior: "smooth" });
  }

  function updateUI() {
    const i = getIndex();
    dots().forEach((d, j) => d.classList.toggle("active", j === i));
    if (btnPrev) btnPrev.disabled = i === 0;
    if (btnNext) btnNext.disabled = i >= total - 1;
  }

  track.addEventListener("scroll", updateUI, { passive: true });
  if (btnPrev) btnPrev.addEventListener("click", () => scrollTo(getIndex() - 1));
  if (btnNext) btnNext.addEventListener("click", () => scrollTo(getIndex() + 1));

  updateUI();
})();

/* ── Fallback para imagens que não carregam ─────────────────── */
document.querySelectorAll("img:not(.topbar-logo):not(.hero-logo)").forEach((img) => {
  img.addEventListener("error", () => {
    if (!img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = "true";
      img.src = IMAGE_FALLBACK;
      img.style.opacity = ".4";
    }
  });
});
