import { describe, expect, it } from "vitest";

import { fakeGame } from "../../games/fakeGame.fixture";
import type { GameInstance, GamePlayer } from "../../games/gameServer.types";
import { BotRunner } from "./BotRunner";

/** Records what the runner asked of a game, without playing one. */
class RecordingInstance implements GameInstance<unknown, unknown, unknown> {
  readonly inputs: Array<{ playerId: string; input: unknown }> = [];
  readonly actions: string[] = [];
  readonly viewsAskedFor: string[] = [];

  onInput(playerId: string, input: unknown): void {
    this.inputs.push({ playerId, input });
  }

  onAction(playerId: string): { ok: true } {
    this.actions.push(playerId);
    return { ok: true };
  }

  tick(): void {
    // Nothing: the runner never ticks the game, the session does.
  }

  onPlayerDisconnect(): void {}
  onPlayerReconnect(): void {}
  onPlayerLeave(): void {}

  getViewFor(viewer: { playerId: string } | { spectator: true }): unknown {
    const id = "playerId" in viewer ? viewer.playerId : "spectator";
    this.viewsAskedFor.push(id);
    return { forPlayerId: id };
  }

  isOver(): boolean {
    return false;
  }

  getRanking(): Array<{ playerId: string; score: number }> {
    return [];
  }
}

function player(playerId: string, isBot: boolean): GamePlayer {
  return { playerId, color: "c1", isBot, connected: true };
}

function runnerOver(players: GamePlayer[]) {
  const instance = new RecordingInstance();
  const runner = new BotRunner({
    game: fakeGame,
    instance,
    players: () => players,
    random: () => 0.5,
  });

  return { instance, runner };
}

describe("BotRunner", () => {
  it("plays each bot once per tick", () => {
    const { instance, runner } = runnerOver([
      player("human", false),
      player("bot-1", true),
      player("bot-2", true),
    ]);

    runner.play(33);

    expect(instance.inputs.map((entry) => entry.playerId)).toEqual(["bot-1", "bot-2"]);
  });

  it("leaves the people alone", () => {
    const { instance, runner } = runnerOver([player("human", false)]);

    runner.play(33);

    expect(instance.inputs).toHaveLength(0);
    expect(instance.viewsAskedFor).toHaveLength(0);
  });

  it("gives each bot its own view, never another player's", () => {
    const { instance, runner } = runnerOver([player("bot-1", true), player("bot-2", true)]);

    runner.play(33);

    expect(instance.viewsAskedFor).toEqual(["bot-1", "bot-2"]);
    expect(instance.inputs.map((entry) => entry.input)).toEqual([{ delta: 1 }, { delta: 1 }]);
  });

  it("forgets a bot that left, because it reads the list at each tick", () => {
    const players = [player("bot-1", true), player("bot-2", true)];
    const { instance, runner } = runnerOver(players);

    runner.play(33);
    players.splice(1, 1);
    runner.play(33);

    expect(instance.inputs.map((entry) => entry.playerId)).toEqual(["bot-1", "bot-2", "bot-1"]);
  });

  it("passes on nothing when the policy decides nothing", () => {
    const instance = new RecordingInstance();
    const runner = new BotRunner({
      game: { ...fakeGame, bot: { nextInput: () => null, nextAction: () => null } },
      instance,
      players: () => [player("bot-1", true)],
      random: () => 0.5,
    });

    runner.play(33);

    expect(instance.inputs).toHaveLength(0);
    expect(instance.actions).toHaveLength(0);
  });
});
