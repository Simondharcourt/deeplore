import { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { PlayerDirection } from "../types";
import { scaleFactor } from "../constants";

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
  target: { x: number; y: number };

  constructor(
    name: string,
    initialPosition: Vec2,
    speed: number,
    scaleFactor: number,
    k: KaboomCtx
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
      "name",
    ]);

    this.k = k;
    this.direction = "down";
    this.isMoving = false;
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
    movement[direction].move(this);
    this.direction = direction;
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

  speak(text: string) {
    const delayByWordsInMs = 350;
    const maxCharsPerLine = 30;
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";

    words.forEach((word) => {
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    lines.push(currentLine);

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

    // Create a text for each line
    const texts = lines.map((line, index) =>
      this.k.add([
        this.k.text(line.trim(), {
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

    setTimeout(() => {
      bubble.destroy();
      texts.map((t) => t.destroy());
    }, delayByWordsInMs * words.length + 400);
  }
}