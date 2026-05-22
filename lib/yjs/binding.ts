import type { Editor, TLRecord } from "tldraw";
import * as Y from "yjs";

const RECORDS_MAP = "records";
const ORIGIN = "tldraw";

export function attachYjsBinding(editor: Editor, ydoc: Y.Doc): () => void {
  const yRecords = ydoc.getMap<TLRecord>(RECORDS_MAP);

  // Seed Yjs from local store if Yjs is empty (first writer).
  if (yRecords.size === 0) {
    const all = editor.store.allRecords();
    if (all.length > 0) {
      ydoc.transact(() => {
        for (const r of all) yRecords.set(r.id, r);
      }, ORIGIN);
    }
  } else {
    // Hydrate tldraw from Yjs.
    const incoming: TLRecord[] = [];
    yRecords.forEach((rec) => incoming.push(rec));
    editor.store.mergeRemoteChanges(() => {
      editor.store.put(incoming);
    });
  }

  // Remote → local.
  const yObserver = (event: Y.YMapEvent<TLRecord>, tx: Y.Transaction) => {
    if (tx.origin === ORIGIN) return; // local echo
    const toPut: TLRecord[] = [];
    const toRemove: TLRecord["id"][] = [];
    event.changes.keys.forEach((change, key) => {
      if (change.action === "delete") {
        toRemove.push(key as TLRecord["id"]);
      } else {
        const v = yRecords.get(key);
        if (v) toPut.push(v);
      }
    });
    editor.store.mergeRemoteChanges(() => {
      if (toPut.length) editor.store.put(toPut);
      if (toRemove.length) editor.store.remove(toRemove);
    });
  };
  yRecords.observe(yObserver);

  // Local → remote.
  const removeStoreListener = editor.store.listen(
    ({ changes }) => {
      ydoc.transact(() => {
        for (const [id, record] of Object.entries(changes.added)) {
          yRecords.set(id, record as TLRecord);
        }
        for (const [id, [, to]] of Object.entries(changes.updated)) {
          yRecords.set(id, to as TLRecord);
        }
        for (const id of Object.keys(changes.removed)) {
          yRecords.delete(id);
        }
      }, ORIGIN);
    },
    { source: "user", scope: "document" },
  );

  return () => {
    yRecords.unobserve(yObserver);
    removeStoreListener();
  };
}
