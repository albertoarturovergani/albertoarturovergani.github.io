# Abstract delle pubblicazioni

Il documento da compilare è [vergani_scholar.bib](vergani_scholar.bib). Ogni referenza contiene un campo `abstract`: l'abstract rimane così associato alla stessa chiave BibTeX, agli autori, al titolo, all'anno e al DOI.

**[Apri il file in modifica su GitHub](https://github.com/albertoarturovergani/albertoarturovergani.github.io/edit/main/vergani_scholar.bib)**

## Come inserire un abstract

• Apri il file con il link qui sopra.

• Cerca il titolo del lavoro o la sua chiave BibTeX, per esempio `Lomi2026GRIN`.

• Incolla il testo fra le parentesi graffe del campo `abstract`, conservando la virgola finale. Puoi scriverlo su più righe.

• Se l'abstract non è ancora disponibile, lascia `abstract = {}`.

• Salva con **Commit changes**. Il normale aggiornamento del sito conserva il campo anche nella bibliografia scaricabile e nel testo ottenuto con **Copy BibTeX**.

Esempio del solo campo da compilare:

```bibtex
abstract = {
  Testo completo dell'abstract associato a questa referenza.
},
```

Il testo dell'esempio è un segnaposto dimostrativo. Le voci per cui il testo originale non è stato recuperato mantengono il campo vuoto.

## Abstract già recuperati

Il 19 novembre 2026 sono stati inseriti 15 abstract originali verificati. Fonti, licenze ed eventuali problemi di corrispondenza sono documentati in [ABSTRACT_SOURCES.md](ABSTRACT_SOURCES.md). Le altre 69 voci restano da completare con testi originali verificabili.

## Regole pratiche

• Mantieni una sola copia da aggiornare: il testo completo va nel campo `abstract` della voce in `vergani_scholar.bib`.

• Usa il testo corrispondente alla specifica versione citata. Un articolo e un contributo congressuale possono avere abstract differenti anche se condividono parte del titolo.

• Conserva la chiave di citazione già presente. Le categorie e gli altri metadati del sito usano quella chiave per riconoscere il lavoro.

• Le parentesi graffe all'interno del testo devono essere bilanciate. Per la compatibilità con LaTeX, scrivi `\%`, `\&`, `\_` e `\#` quando questi caratteri sono testo letterale.

• Inserisci nuove referenze con una chiave univoca e aggiungi anche il campo `abstract`. Puoi completarlo subito o lasciarlo vuoto.

## Cosa viene mostrato sul sito

Il file `.bib` mantiene insieme referenze e abstract. Il processo di pubblicazione conserva il record completo nella funzione **Copy BibTeX** e nel file scaricabile. Nella pagina Publications, le referenze con testo disponibile hanno un pannello **Abstract** apribile. Il pannello mostra il testo completo e, quando registrati, i collegamenti alla fonte e alla licenza. Le voci prive di testo mantengono soltanto la citazione. I pulsanti **GitHub** collegano ai repository associati e verificati, configurati in `content/repositories.json`.

Questa pagina è la guida di compilazione. Gli abstract si aggiornano direttamente nel `.bib`, quindi qui non esiste una seconda raccolta di testi da sincronizzare.

## Compatibilità del campo

Il formato `.bib` permette di conservare `abstract`. Per BibTeX classico è un campo aggiuntivo, normalmente ignorato dagli stili bibliografici standard; per biblatex è un campo del modello dati. La sua presenza nel file non determina automaticamente la stampa dell'abstract nel CV o nella bibliografia LaTeX.

Riferimenti: [documentazione ufficiale JabRef sui campi BibTeX](https://docs.jabref.org/advanced/fields), [manuale ufficiale biblatex, sezione 2.2.2](https://ctan.net/macros/latex/contrib/biblatex/doc/biblatex.pdf).
