// CIRQL — NPC dialog framework (Phase K1).
//
// A reusable, data-authored BRANCHING dialog: a small graph of nodes, each a few lines
// plus optional player choices that jump to another node, accept a quest, or end the
// chat. The engine plays a DialogTree generically (see cirql-world-engine drawDialog /
// pickChoice), so NPCs, talk-chain quests (K3) and shopkeepers (F) all reuse one system.
// A plain linear dialog is just a one-node tree (simpleDialog).

export interface DialogChoice {
  label: string;         // the button text the player taps
  goto?: string;         // jump to this node id
  accept?: string;       // accept this quest id, then close
  pick?: string;         // resolve the pending mystery/choice quest with this option id, then close
  answer?: string;       // answer the pending RIDDLE with this option id (correct → completes; wrong → retry)
  buy?: string;          // Pet Stall: "type:cost" — adopt this pet (host takes the sparqs)
  petact?: string;       // pet interaction: "pet" | "play" | "rename"
  // (no goto + accept + pick + answer + buy + petact) → the choice closes the conversation
}
export interface DialogNode {
  lines: string[];       // spoken lines, advanced with E/tap
  choices?: DialogChoice[];   // offered at the last line; without choices the node closes
}
export interface DialogTree {
  nodes: Record<string, DialogNode>;
  start: string;
}

/** A one-node linear dialog (backwards-compatible with the old lines+acceptOnClose flow). */
export function simpleDialog(lines: string[], accept?: string): DialogTree {
  return { nodes: { start: { lines, choices: accept ? [{ label: "✦ Accept", accept }, { label: "Not now" }] : undefined } }, start: "start" };
}

/** The FORK of a mystery/choice quest: a prompt + one button per option. Each option carries
 *  the quest-choice option id, resolved by the engine (grants that option's reward + sets a flag). */
export function choiceDialog(prompt: string[], options: { id: string; label: string; blurb?: string }[]): DialogTree {
  return { nodes: { start: { lines: prompt, choices: options.map((o) => ({ label: o.blurb ? `${o.label} — ${o.blurb}` : o.label, pick: o.id })) } }, start: "start" };
}

/**
 * A branching NPC conversation: a greeting hub with "About here", an optional work/quest
 * offer, and a farewell. Lore + the quest intro are separate nodes you can return from.
 */
export function npcConversation(opts: {
  greeting: string[];
  lore: string[];
  questIntro?: string[];    // the giver's pitch for an available (or repeatable) quest
  questId?: string;
  repeat?: boolean;         // a repeatable re-offer (slighter reward)
  loreLabel?: string;       // override the "Tell me about this place" hub label
  topics?: { label: string; lines: string[] }[];   // extra personality topics (K2 named cast)
}): DialogTree {
  const nodes: Record<string, DialogNode> = {};
  const hubChoices: DialogChoice[] = [{ label: opts.loreLabel ?? "Tell me about this place", goto: "lore" }];
  (opts.topics ?? []).forEach((t, i) => { hubChoices.push({ label: t.label, goto: `topic${i}` }); nodes[`topic${i}`] = { lines: t.lines, choices: [{ label: "◂ Back", goto: "start" }, { label: "Farewell" }] }; });
  if (opts.questId && opts.questIntro) hubChoices.push({ label: "Any work for me?", goto: "work" });
  hubChoices.push({ label: "Farewell" });

  nodes.start = { lines: opts.greeting, choices: hubChoices };
  nodes.lore = { lines: opts.lore, choices: [{ label: "◂ Back", goto: "start" }, { label: "Farewell" }] };
  if (opts.questId && opts.questIntro) {
    nodes.work = {
      lines: opts.repeat ? [...opts.questIntro, "— though you've walked this path before; the reward will be slighter."] : opts.questIntro,
      choices: [{ label: "✦ I'll do it", accept: opts.questId }, { label: "Maybe later", goto: "start" }],
    };
  }
  return { nodes, start: "start" };
}
