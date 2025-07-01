import { doc, runTransaction, collection } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function criarImovelComIdSequencial(
  dadosImovel: Record<string, unknown>
) {
  const counterRef = doc(db, "counters", "imoveis");
  const imoveisCollection = collection(db, "imoveis");

  const novoId = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let lastId = 0;
    if (counterDoc.exists()) {
      lastId = (counterDoc.data().lastId as number) || 0;
    }
    const nextId = lastId + 1;

    transaction.set(counterRef, { lastId: nextId });

    const novoDocRef = doc(imoveisCollection, nextId.toString());
    transaction.set(novoDocRef, { id: nextId.toString(), ...dadosImovel });

    return nextId;
  });

  return novoId;
}
