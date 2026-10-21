"use strict";

const hasGSAP = typeof window.gsap !== "undefined";


/* =====================================================
   DAILY THEMES
===================================================== */

const DAILY_THEMES = [

  {
    name: "THE BROKEN LAMP",
    subtitle: "A tiny light is waiting for someone.",
    message: "The lamp has one last chance.",

    finalSmall: "YOU RESTORED THE LIGHT",
    finalTitle: "THE SECRET ROOM",
    finalDescription: "Tomorrow, another story will begin.",

    accent: "#ffb347",
    accent2: "#ff7043",

    bg1: "#080706",
    bg2: "#18120c",

    shirt: "#397cff",
    pants: "#17243d",

    hue: 32,
    outfit: "blue",
    icon: "✦"
  },

  {
    name: "THE GREEN DOOR",
    subtitle: "Something behind the door is calling.",
    message: "The key is closer than it looks.",

    finalSmall: "THE DOOR REMEMBERS",
    finalTitle: "THE GREEN ROOM",
    finalDescription: "A new mystery arrives tomorrow.",

    accent: "#54e38e",
    accent2: "#19b978",

    bg1: "#050b08",
    bg2: "#0d1b14",

    shirt: "#32a866",
    pants: "#17271f",

    hue: 145,
    outfit: "green",
    icon: "◇"
  },

  {
    name: "THE RAINY WINDOW",
    subtitle: "A light appears beyond the glass.",
    message: "Someone left a message in the rain.",

    finalSmall: "THE WINDOW OPENED",
    finalTitle: "THE HIDDEN HALL",
    finalDescription: "The next mystery is already waiting.",

    accent: "#6fb8ff",
    accent2: "#806cff",

    bg1: "#050811",
    bg2: "#11172a",

    shirt: "#f1c84c",
    pants: "#26344e",

    hue: 220,
    outfit: "yellow",
    icon: "☼"
  },

  {
    name: "THE OLD CLOCK",
    subtitle: "The clock stopped at exactly midnight.",
    message: "One second is missing.",

    finalSmall: "TIME MOVED AGAIN",
    finalTitle: "THE CLOCK ROOM",
    finalDescription: "Tomorrow, time will tell another story.",

    accent: "#ff6c6c",
    accent2: "#b33cff",

    bg1: "#0d0609",
    bg2: "#1c0c15",

    shirt: "#d94949",
    pants: "#282032",

    hue: 355,
    outfit: "red",
    icon: "◷"
  },

  {
    name: "THE SECRET DRAWER",
    subtitle: "There is something hidden underneath.",
    message: "The drawer only opens for the curious.",

    finalSmall: "YOU FOUND THE DRAWER",
    finalTitle: "THE GOLDEN ROOM",
    finalDescription: "Another secret will appear tomorrow.",

    accent: "#ffd166",
    accent2: "#e9a93b",

    bg1: "#0c0904",
    bg2: "#1b1509",

    shirt: "#f0d9b5",
    pants: "#403226",

    hue: 45,
    outfit: "cream",
    icon: "◆"
  },

  {
    name: "THE CANDLE ROOM",
    subtitle: "One small flame can change everything.",
    message: "Don't let the light disappear.",

    finalSmall: "THE FLAME SURVIVED",
    finalTitle: "THE CANDLE ROOM",
    finalDescription: "The next flame will be different.",

    accent: "#5de0ff",
    accent2: "#377dff",

    bg1: "#04080c",
    bg2: "#081621",

    shirt: "#285a9e",
    pants: "#101d2d",

    hue: 195,
    outfit: "cyan",
    icon: "◈"
  },

  {
    name: "THE MYSTERIOUS KEY",
    subtitle: "A strange key appears in the darkness.",
    message: "Maybe it opens something important.",

    finalSmall: "THE KEY FIT",
    finalTitle: "THE LOCKED ROOM",
    finalDescription: "Tomorrow, another key will appear.",

    accent: "#ff79b0",
    accent2: "#8f6bff",

    bg1: "#0b050b",
    bg2: "#170b1b",

    shirt: "#9254c7",
    pants: "#251b36",

    hue: 315,
    outfit: "purple",
    icon: "⚿"
  }

];


/* =====================================================
   DATE
===================================================== */

function getLocalDateKey() {

  const now = new Date();

  const year = now.getFullYear();

  const month =
    String(now.getMonth() + 1).padStart(2, "0");

  const day =
    String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* =====================================================
   HASH
===================================================== */

function hashString(str) {

  let hash = 0;

  for (let i = 0; i < str.length; i++) {

    hash =
      ((hash << 5) - hash) +
      str.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash);
}


/* =====================================================
   GET TODAY'S THEME
===================================================== */

function getDailyTheme() {

  const dateKey = getLocalDateKey();

  const index =
    hashString(dateKey) %
    DAILY_THEMES.length;

  return {
    ...DAILY_THEMES[index],
    dateKey,
    index
  };
}

const DAILY = getDailyTheme();


/* =====================================================
   ELEMENTS
===================================================== */

const root = document.documentElement;

const storyScreen =
  document.getElementById("storyScreen");

const loginScreen =
  document.getElementById("loginScreen");

const finalScreen =
  document.getElementById("finalScreen");

const childWrap =
  document.getElementById("childWrap");

const child =
  document.getElementById("child");

const mainLampWrap =
  document.getElementById("mainLampWrap");

const lamp =
  document.getElementById("lamp");

const lampGlow =
  document.getElementById("lampGlow");

const flame =
  document.getElementById("flame");


/* IMPORTANT FIX:
   HTML has id="glassPieces"
*/

const glassPieces =
  document.querySelectorAll(
    "#glassPieces span"
  );

const repairSparks =
  document.querySelectorAll(
    "#repairSparks i"
  );

const cordArea =
  document.getElementById("cordArea");

const cordBall =
  document.getElementById("cordBall");

const cordLine =
  document.querySelector(".cord-line");

const cordLabel =
  document.getElementById("cordLabel");

const storyMessage =
  document.getElementById("storyMessage");

const storySkip =
  document.getElementById("storySkip");

const introParticles =
  document.getElementById("introParticles");

const storyTitle =
  document.getElementById("storyTitle");

const storySubtitle =
  document.getElementById("storySubtitle");

const loginCard =
  document.getElementById("loginCard");

const loginIcon =
  document.getElementById("loginIcon");

const loginTitle =
  document.getElementById("loginTitle");

const loginDescription =
  document.getElementById("loginDescription");

const dailyStoryName =
  document.getElementById("dailyStoryName");

const dailyBadgeText =
  document.getElementById("dailyBadgeText");

const finalSmall =
  document.getElementById("finalSmall");

const finalTitle =
  document.getElementById("finalTitle");

const finalDescription =
  document.getElementById("finalDescription");

const doorSymbol =
  document.getElementById("doorSymbol");

const loginForm =
  document.getElementById("loginForm");

const restartButton =
  document.getElementById("restartButton");

const replayButton =
  document.getElementById("replayButton");

const soundButton =
  document.getElementById("soundButton");

const soundIcon =
  document.getElementById("soundIcon");


/* =====================================================
   STATE
===================================================== */

const state = {

  storyTimeline: null,
  walkTimeline: null,
  cardColorTimeline: null,

  cordPulled: false,
  storyFinished: false,

  sound: true

};


/* =====================================================
   COLOR
===================================================== */

function hexToRgba(hex, alpha) {

  const value =
    hex.replace("#", "");

  const bigint =
    parseInt(value, 16);

  const r =
    (bigint >> 16) & 255;

  const g =
    (bigint >> 8) & 255;

  const b =
    bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


/* =====================================================
   APPLY DAILY THEME
===================================================== */

function applyDailyTheme() {

  root.style.setProperty(
    "--accent",
    DAILY.accent
  );

  root.style.setProperty(
    "--accent2",
    DAILY.accent2
  );

  root.style.setProperty(
    "--bg1",
    DAILY.bg1
  );

  root.style.setProperty(
    "--bg2",
    DAILY.bg2
  );

  root.style.setProperty(
    "--shirt",
    DAILY.shirt
  );

  root.style.setProperty(
    "--pants",
    DAILY.pants
  );

  root.style.setProperty(
    "--glow",
    hexToRgba(DAILY.accent, .35)
  );

  root.style.setProperty(
    "--cardHue",
    DAILY.hue
  );


  storyTitle.textContent =
    DAILY.name;

  storySubtitle.textContent =
    DAILY.subtitle;

  storyMessage.textContent =
    DAILY.message;

  loginIcon.textContent =
    DAILY.icon;

  loginTitle.textContent =
    "ENTER THE SECRET";

  loginDescription.textContent =
    DAILY.subtitle;

  dailyStoryName.textContent =
    `${DAILY.name} • ${DAILY.dateKey}`;

  dailyBadgeText.textContent =
    `TODAY'S STORY • ${
      String(DAILY.index + 1).padStart(2, "0")
    }`;


  finalSmall.textContent =
    DAILY.finalSmall;

  finalTitle.textContent =
    DAILY.finalTitle;

  finalDescription.textContent =
    DAILY.finalDescription;

  doorSymbol.textContent =
    DAILY.icon;
}


/* =====================================================
   PARTICLES
===================================================== */

function createIntroParticles() {

  introParticles.innerHTML = "";

  const count =
    window.innerWidth < 700
      ? 70
      : 120;

  for (let i = 0; i < count; i++) {

    const p =
      document.createElement("span");

    p.className =
      "intro-particle";

    p.style.left =
      `${Math.random() * 100}%`;

    p.style.top =
      `${Math.random() * 100}%`;

    p.dataset.x =
      (Math.random() - .5) * 500;

    p.dataset.y =
      (Math.random() - .5) * 500;

    introParticles.appendChild(p);
  }
}


/* =====================================================
   RESET
===================================================== */

function resetElements() {

  if (!hasGSAP) {
    console.warn("GSAP failed to load.");
    return;
  }

  if (state.storyTimeline)
    state.storyTimeline.kill();

  if (state.walkTimeline)
    state.walkTimeline.kill();

  if (state.cardColorTimeline)
    state.cardColorTimeline.kill();


  state.storyTimeline = null;
  state.walkTimeline = null;

  state.cordPulled = false;
  state.storyFinished = false;


  storyScreen.style.display =
    "block";

  loginScreen.style.visibility =
    "hidden";

  finalScreen.style.display =
    "none";


  gsap.set(loginScreen, {
    autoAlpha: 0
  });

  gsap.set(finalScreen, {
    autoAlpha: 0
  });

  gsap.set(storySkip, {
    autoAlpha: 1
  });


  gsap.set(childWrap, {
    x: "-20vw",
    scale: .25,
    opacity: 0
  });

  gsap.set(mainLampWrap, {
    scale: .9,
    opacity: 0
  });

  gsap.set(lampGlow, {
    opacity: 0,
    scale: .6
  });

  gsap.set(flame, {
    opacity: 0,
    scale: .6
  });

  gsap.set(glassPieces, {
    opacity: 0,
    scale: 0
  });

  gsap.set(repairSparks, {
    opacity: 0,
    scale: 0
  });

  gsap.set(cordArea, {
    opacity: 0
  });

  gsap.set(cordLine, {
    scaleY: 0
  });

  gsap.set(cordBall, {
    y: 0
  });

  gsap.set(cordLabel, {
    opacity: 0
  });

  gsap.set(storyMessage, {
    opacity: 0
  });

  gsap.set(storyTitle, {
    opacity: 0,
    y: 20
  });

  gsap.set(storySubtitle, {
    opacity: 0,
    y: 15
  });

  gsap.set(".child", {
    rotation: 0
  });

  gsap.set(".carry-lamp", {
    rotation: 0
  });

  gsap.set(".arm-left", {
    rotation: 14
  });

  gsap.set(".arm-right", {
    rotation: -20
  });
}


/* =====================================================
   WALK LOOP
===================================================== */

function startWalkLoop() {

  if (!hasGSAP)
    return;

  if (state.walkTimeline)
    state.walkTimeline.kill();


  state.walkTimeline =
    gsap.timeline({
      repeat: -1
    });


  state.walkTimeline

    .to(".leg-left", {
      rotation: 16,
      duration: .25,
      ease: "sine.inOut"
    })

    .to(".leg-left", {
      rotation: -16,
      duration: .25,
      ease: "sine.inOut"
    })

    .to(".leg-right", {
      rotation: -16,
      duration: .25,
      ease: "sine.inOut"
    }, "<")

    .to(".leg-right", {
      rotation: 16,
      duration: .25,
      ease: "sine.inOut"
    })

    .to(child, {
      y: -4,
      duration: .25,
      ease: "sine.inOut"
    }, 0)

    .to(child, {
      y: 0,
      duration: .25,
      ease: "sine.inOut"
    }, .25);
}


/* =====================================================
   PLAY STORY
===================================================== */

function playStory() {

  if (!hasGSAP) {

    alert(
      "GSAP load nahi hua. Internet connection check karo."
    );

    return;
  }


  resetElements();

  createIntroParticles();


  const tl =
    gsap.timeline({

      onComplete() {

        state.storyFinished = true;

        gsap.to(storySkip, {
          autoAlpha: 0,
          duration: .25
        });

        showLogin();
      }

    });


  state.storyTimeline = tl;


  tl

    .to(storyTitle, {
      opacity: 1,
      y: 0,
      duration: .8,
      ease: "power3.out"
    })

    .to(storySubtitle, {
      opacity: 1,
      y: 0,
      duration: .7
    }, "-=.45");


  const particles =
    document.querySelectorAll(
      ".intro-particle"
    );


  tl.to(particles, {

    x: 0,
    y: 0,

    scale: .7,
    opacity: .15,

    duration: 1.4,

    stagger: {
      each: .006,
      from: "random"
    },

    ease: "power2.in"

  }, "+=.2");


  tl.to(childWrap, {

    opacity: 1,

    x: "5vw",

    scale: .45,

    duration: 1.4,

    ease: "power3.out",

    onStart() {
      startWalkLoop();
    }

  });


  tl.to(childWrap, {

    x: "29vw",

    scale: .85,

    duration: 2.8,

    ease: "power2.inOut"

  });


  if (state.walkTimeline)
    state.walkTimeline.pause();


  tl

    .to(child, {
      y: -7,
      duration: .25
    })

    .to(child, {
      y: 0,
      duration: .25
    });


  tl.to(mainLampWrap, {

    opacity: 1,

    scale: 1,

    duration: 1,

    ease: "back.out(1.5)"

  });


  tl

    .to(mainLampWrap, {
      rotation: 7,
      y: 25,
      duration: .4,
      ease: "power2.in"
    })

    .to(mainLampWrap, {
      rotation: -6,
      y: 5,
      duration: .2
    })

    .to(mainLampWrap, {
      rotation: 0,
      y: 0,
      duration: .4,
      ease: "elastic.out(1,.4)"
    });


  tl.to(glassPieces, {

    opacity: 1,
    scale: 1,

    x: () =>
      (Math.random() - .5) * 60,

    y: () =>
      (Math.random() - .5) * 50,

    rotation: () =>
      Math.random() * 180,

    duration: .5,

    stagger: .03

  });


  tl.to(childWrap, {

    x: "34vw",

    scale: .82,

    duration: 1,

    ease: "power2.inOut"

  });


  tl.to(repairSparks, {

    opacity: 1,

    scale: 1,

    duration: .25,

    stagger: .05

  });


  tl.to(repairSparks, {

    opacity: 0,

    scale: 2,

    x: () =>
      (Math.random() - .5) * 70,

    y: () =>
      (Math.random() - .5) * 70,

    duration: .5,

    stagger: .03

  });


  tl

    .to(".arm-right", {
      rotation: -55,
      duration: .25
    })

    .to(".arm-right", {
      rotation: -20,
      duration: .25
    })

    .to(".arm-right", {
      rotation: -55,
      duration: .25
    })

    .to(".arm-right", {
      rotation: -20,
      duration: .25
    });


  tl.to(lampGlow, {

    opacity: .75,

    scale: 1.3,

    duration: .8,

    ease: "power2.out"

  });


  tl.to(flame, {

    opacity: 1,

    scale: 1,

    duration: .5,

    ease: "back.out(2)"

  });


  tl.to(glassPieces, {

    opacity: 0,
    scale: 0,

    duration: .35

  });


  tl.to(storyMessage, {

    opacity: 1,

    duration: .7

  });


  tl.to(cordArea, {

    opacity: 1,

    duration: .6

  });


  tl.to(cordLine, {

    scaleY: 1,

    duration: .7,

    ease: "power2.out"

  });


  tl.to(cordLabel, {

    opacity: 1,

    duration: .6

  });


  tl.to(cordBall, {

    y: 8,

    duration: .5,

    ease: "sine.inOut",

    repeat: 2,

    yoyo: true

  });


  tl.to({}, {
    duration: 2
  });
}


/* =====================================================
   SKIP STORY
===================================================== */

function skipStory() {

  if (!hasGSAP)
    return;

  if (state.storyFinished)
    return;


  if (state.storyTimeline)
    state.storyTimeline.kill();

  if (state.walkTimeline)
    state.walkTimeline.kill();


  state.storyFinished = true;


  gsap.to(
    [
      childWrap,
      mainLampWrap,
      cordArea,
      storyTitle,
      storySubtitle,
      storyMessage
    ],
    {
      opacity: 0,
      duration: .35,
      ease: "power2.in"
    }
  );


  gsap.to(storySkip, {
    autoAlpha: 0,
    duration: .2
  });


  setTimeout(() => {
    showLogin();
  }, 350);
}


/* =====================================================
   LOGIN
===================================================== */

function showLogin() {

  if (!hasGSAP)
    return;


  storyScreen.style.display =
    "block";

  loginScreen.style.visibility =
    "visible";


  gsap.set(loginScreen, {
    autoAlpha: 0
  });


  gsap.to(loginScreen, {

    autoAlpha: 1,

    duration: .8,

    ease: "power2.out"

  });


  gsap.fromTo(
    loginCard,

    {
      y: 70,
      scale: .85,
      opacity: 0,
      rotationX: 8
    },

    {
      y: 0,
      scale: 1,
      opacity: 1,
      rotationX: 0,

      duration: 1.1,

      ease: "back.out(1.4)"
    }
  );


  animateLoginCard();


  gsap.fromTo(
    ".input-box, .enter-button, .daily-story-name",

    {
      y: 20,
      opacity: 0
    },

    {
      y: 0,
      opacity: 1,

      duration: .5,

      stagger: .1,

      delay: .45,

      ease: "power2.out"
    }
  );
}


/* =====================================================
   LOGIN CARD ANIMATION
===================================================== */

function animateLoginCard() {

  if (!hasGSAP)
    return;


  if (state.cardColorTimeline)
    state.cardColorTimeline.kill();


  state.cardColorTimeline =
    gsap.timeline({
      repeat: -1,
      yoyo: true
    });


  state.cardColorTimeline

    .to(root, {

      "--cardHue":
        DAILY.hue + 35,

      duration: 4,

      ease: "sine.inOut"

    })

    .to(root, {

      "--cardHue":
        DAILY.hue - 25,

      duration: 4,

      ease: "sine.inOut"

    });


  gsap.to(loginCard, {

    y: -5,

    duration: 3,

    repeat: -1,

    yoyo: true,

    ease: "sine.inOut"

  });


  gsap.to(loginIcon, {

    rotation: 8,

    scale: 1.06,

    duration: 2.2,

    repeat: -1,

    yoyo: true,

    ease: "sine.inOut"

  });
}


/* =====================================================
   PULL CORD
===================================================== */

function pullCord() {

  if (!hasGSAP)
    return;

  if (state.cordPulled)
    return;


  state.cordPulled = true;


  gsap.timeline()

    .to(cordBall, {
      y: 30,
      duration: .25,
      ease: "power2.in"
    })

    .to(cordBall, {
      y: 0,
      duration: .45,
      ease: "elastic.out(1,.4)"
    })

    .to(cordLabel, {
      opacity: 0,
      duration: .2
    });


  gsap.to(lampGlow, {

    opacity: .95,

    scale: 1.5,

    duration: .5

  });


  gsap.to(flame, {

    scale: 1.25,

    duration: .3,

    yoyo: true,

    repeat: 1

  });


  gsap.to(child, {

    y: -15,

    duration: .25,

    yoyo: true,

    repeat: 1,

    ease: "power2.out"

  });


  setTimeout(() => {

    if (!state.storyFinished) {

      state.storyFinished = true;

      showLogin();
    }

  }, 850);
}


/* =====================================================
   LOGIN → SECRET VAULT
===================================================== */

function enterSecret() {

  window.location.href =
    "secret.html";
}


/* =====================================================
   FORM
===================================================== */

loginForm.addEventListener(
  "submit",
  function(event) {

    event.preventDefault();

    enterSecret();
  }
);


/* =====================================================
   FINAL PARTICLES
===================================================== */

function createFinalParticles() {

  const container =
    document.getElementById(
      "finalParticles"
    );

  if (!container)
    return;


  container.innerHTML = "";


  for (let i = 0; i < 80; i++) {

    const p =
      document.createElement("span");

    p.className =
      "intro-particle";

    p.style.left =
      `${50 + (Math.random() - .5) * 35}%`;

    p.style.top =
      `${55 + (Math.random() - .5) * 30}%`;

    container.appendChild(p);


    if (hasGSAP) {

      gsap.fromTo(

        p,

        {
          opacity: 0,
          scale: 0
        },

        {
          opacity:
            Math.random() * .7 + .2,

          scale:
            Math.random() * 1.8 + .5,

          x:
            (Math.random() - .5) * 500,

          y:
            (Math.random() - .5) * 500,

          duration:
            Math.random() * 3 + 2,

          delay:
            Math.random() * .7,

          repeat: -1,

          yoyo: true,

          ease: "sine.inOut"
        }
      );
    }
  }
}


/* =====================================================
   REPLAY
===================================================== */

function replayStory() {

  if (!hasGSAP)
    return;


  if (state.cardColorTimeline)
    state.cardColorTimeline.kill();


  gsap.killTweensOf(loginCard);
  gsap.killTweensOf(loginIcon);


  loginScreen.style.visibility =
    "hidden";

  finalScreen.style.display =
    "none";


  loginForm.reset();


  playStory();
}


/* =====================================================
   EVENTS
===================================================== */

restartButton.addEventListener(
  "click",
  replayStory
);

storySkip.addEventListener(
  "click",
  skipStory
);

cordBall.addEventListener(
  "click",
  pullCord
);

soundButton.addEventListener(
  "click",
  () => {

    state.sound =
      !state.sound;

    soundIcon.textContent =
      state.sound
        ? "◉"
        : "○";
  }
);

replayButton.addEventListener(
  "click",
  replayStory
);


/* =====================================================
   AUTO DAILY REFRESH
===================================================== */

let currentDate =
  getLocalDateKey();


setInterval(() => {

  const newDate =
    getLocalDateKey();

  if (newDate !== currentDate) {

    location.reload();
  }

}, 30000);


/* =====================================================
   START
===================================================== */

applyDailyTheme();

createIntroParticles();

playStory();