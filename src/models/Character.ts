import { GameObj, KaboomCtx, PosComp, TextComp, Vec2 } from "kaboom";
import { PlayerDirection } from "../types";
import { MAX_LISTEN_RANGE, scaleFactor, START_TRUNCATED_RANGE } from "../constants";
import Game from "./Game";
import { calculateDistance, truncateText } from "../utils";

export type PlayerMovement = {
  move: (character: Character) => void;
  animToPlay: string;
};

const movement: {
  [key in PlayerDirection]: PlayerMovement;
} = {
  up: {
    move: (character: Character) => {
      character.gameObject.move(0, -character.speed);
    },
    animToPlay: "walk-up",
  },
  down: {
    move: (character: Character) => {
      character.gameObject.move(0, character.speed);
    },
    animToPlay: "walk-down",
  },
  left: {
    move: (character: Character) => {
      character.gameObject.move(-character.speed, 0);
    },
    animToPlay: "walk-left",
  },
  right: {
    move: (character: Character) => {
      character.gameObject.move(character.speed, 0);
    },
    animToPlay: "walk-right",
  },
};

export default class Character {
  name: string;
  initialPosition: Vec2;
  speed: number;
  gameObject: GameObj;
  direction: PlayerDirection;
  k: KaboomCtx;
  isMoving: boolean;
  target?: { x: number; y: number };
  forbidMoving: boolean;
  firstName: string;
  lastName: string;
  player: Character | null;
  thinkingBubble: GameObj | null = null;
  thinkingText: GameObj<PosComp | TextComp> | null = null;

  constructor(
    name: string,
    initialPosition: Vec2,
    speed: number,
    scaleFactor: number,
    k: KaboomCtx,
    firstName: string,
    lastName: string,
    player: Character | null = null
  ) {
    this.name = name;
    this.initialPosition = initialPosition;
    this.speed = speed;
    this.gameObject = k.make([
      k.sprite("spritesheet", { anim: `${name}-idle-down` }),
      k.area({
        shape: new k.Rect(k.vec2(0, 3), 10, 10),
      }),
      k.body(),
      k.anchor("center"),
      k.pos(initialPosition),
      k.scale(scaleFactor),
      name,
    ]);

    this.k = k;
    this.direction = "down";
    this.isMoving = false;
    this.forbidMoving = false;
    this.firstName = firstName;
    this.lastName = lastName;
    this.player = player;
  }

  startMovement(direction: PlayerDirection) {
    this.direction = direction;
    this.gameObject.play(this.name + "-" + movement[direction].animToPlay);
    this.isMoving = true;
  }

  stopMovement() {
    this.playIdleAnimation();
    this.isMoving = false;
  }

  setTarget(target: { x: number; y: number }) {
    this.target = target;
  }

  move(direction: PlayerDirection) {
    if (Game.getInstance().isGamePaused || this.forbidMoving) return;
    movement[direction].move(this);
    this.direction = direction;
  }

  hear(text: string, speaker: Character) {
    this.startThinking();
    fetch("https://app-fqj7trlqhq-od.a.run.app/hear", {
      method: "POST",
      // no cors
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: text,
        npc: this.name,
        id: this.name,
        firstname: this.firstName,
        lastname: this.lastName,
        speaker: speaker.firstName + " " + speaker.lastName,
        distance: distanceToString(calculateDistance(this.gameObject.pos, speaker.gameObject.pos)),
      }),
    })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        this.speak(data.Speech);
      })
      .catch((e) => {
        console.log(e);
        this.speak("Nolo comprendo");
      })
      .finally(() => {
        this.stopThinking();
      });
  }

  playAnimation(animation: string) {
    this.gameObject.play(animation);
  }

  playIdleAnimation() {
    this.gameObject.play(`${this.name}-idle-${this.direction}`);
  }

  movementNeeded(mapWidth: number, mapHeight: number) {
    const x = this.gameObject.pos.x / scaleFactor;
    const y = this.gameObject.pos.y / scaleFactor;
    console.log(x, y, mapWidth, mapHeight);
    return x % mapWidth === 0 && y % mapHeight === 0;
  }

  obfuscateBasedOnDistance(line: string, speakingCharacter: Character | null): string {
    if (!speakingCharacter) return line;
    const distance = calculateDistance(this.gameObject.pos, speakingCharacter.gameObject.pos);
    if (distance > START_TRUNCATED_RANGE && distance < MAX_LISTEN_RANGE) {
      return truncateText(line, distance - START_TRUNCATED_RANGE);
    }
    return line;
  }

  async startThinking() {
    this.thinkingBubble = this.k.add([
      this.k.rect(50, 28, {
        radius: 5,
      }),
      this.k.pos(
        this.gameObject.pos.x - 50 / 2,
        this.gameObject.pos.y - 80
      ),
      this.k.color(255, 255, 255),
    ]);
    let i = 0;
    this.thinkingText = this.k.add([
      this.k.text("", {
        size: 24,
        font: "monospace",
        transform: {
          color: this.k.rgb(0, 0, 0),
        },
      }),
      this.k.pos(
        this.gameObject.pos.x - 50 / 2,
        this.gameObject.pos.y - 80
      ),
    ]);
    while (this.thinkingBubble) {
      i++;
      await this.k.wait(0.1);
      if (!this.thinkingText) {
        continue;
      }
      this.thinkingText.text = ".".repeat(i);
      if (i > 3) {
        i = 0;
        this.thinkingText.text = "";
      }
    }
  }

  stopThinking() {
    this.thinkingBubble?.destroy();
    this.thinkingText?.destroy();
    this.thinkingBubble = null;
    this.thinkingText = null;
  }

  speak(text: string) {
    const maxCharsPerLine = 30;
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";
    this.forbidMoving = true;

    words.forEach((word) => {
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    lines.push(currentLine);

    this.displayBubbles(lines);
  }

  private displayBubbles(lines: string[]) {
    if (!lines.length) {
      this.forbidMoving = false;
      return;
    }
    this.displayBubble([lines.shift() || "", lines.shift() || ""], () => {
      this.displayBubbles(lines);
    });
  }

  private displayBubble(lines: string[], closed: () => void) {
    const lineHeight = 12;
    const bubblePadding = 8;
    const bubbleWidth = 250;
    const bubbleHeight = lines.length * lineHeight + bubblePadding * 2;
    const offsetY = 100;
    // Create a bubble
    const bubble = this.k.add([
      this.k.rect(bubbleWidth, bubbleHeight, {
        radius: 5,
      }),
      this.k.pos(
        this.gameObject.pos.x - bubbleWidth / 2,
        this.gameObject.pos.y - offsetY
      ),
      this.k.color(255, 255, 255),
    ]);

    const texts = lines.map((line, index) =>
      this.k.add([
        this.k.text(this.obfuscateBasedOnDistance(line.trim(), this.player), {
          size: 12,
          font: "monospace",
          transform: {
            color: this.k.rgb(0, 0, 0),
          },
        }),
        this.k.pos(
          this.gameObject.pos.x - bubbleWidth / 2 + bubblePadding, // Adjust the x position
          this.gameObject.pos.y - offsetY + bubblePadding + index * lineHeight // Adjust the y position for each line
        ),
        this.k.color(0, 0, 0),
      ])
    );

    const delayByWordsInMs = 350;
    const wordCount = lines.reduce(
      (acc, line) => acc + line.split(" ").length,
      0
    );
    const destroyDelay = delayByWordsInMs * wordCount + 400;

    const bubbleInterval = setInterval(() => {
      if (Game.getInstance().isGamePaused) return;
      bubble.destroy();
      texts.map((t) => t.destroy());
      clearInterval(bubbleInterval);
      closed();
    }, destroyDelay);
  }
}

function distanceToString(distance: number) {
  if (distance < START_TRUNCATED_RANGE) {
    return "proche";
  } else if (distance < (START_TRUNCATED_RANGE + MAX_LISTEN_RANGE) / 2) {
    return "pas très loin";
  }
  return "loin";
}
