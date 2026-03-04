

## Problem Analysis

The `entryEtapaMap` in `Historico.tsx` (line 285) only detects etapa changes from history entries where `acao === 'Alteração de Etapa'`. However, after the recent consolidation change in `EditChamadoModal`, edits now create entries with `acao === 'Atualização de Ticket'` and the etapa change is embedded in the description as `Etapa: "THOR" → "Aguardando Resposta"`.

This means the etapa reconstruction logic never picks up etapa changes made through the edit modal, so all subsequent cards remain colored as THOR (red).

## Plan

**Edit `src/pages/Historico.tsx`** -- Update the `entryEtapaMap` builder (lines 283-295) to also parse etapa changes from consolidated "Atualização de Ticket" entries. The logic should:

1. Keep existing check for `acao === 'Alteração de Etapa'` with `para "X"` pattern
2. Add a check for entries containing `Etapa:` in the description, parsing the `→ "X"` pattern to extract the new etapa label
3. Convert the label back to the key using `etapaLabelsMap` as before

This is a ~5 line change in the `entryEtapaMap` builder function.

