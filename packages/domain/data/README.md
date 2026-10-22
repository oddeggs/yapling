# Level guide word lists

Read by the level check (`packages/story/src/level-check.ts`) beside the level guide (`packages/domain/src/level-guide.ts`). Not exported from any package entry, so nothing here is bundled into the app.

## `cefr-j-1.6.json`: CEFR bands (third-party)

**Source:** The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from http://www.cefr-j.org/download.html on 23/10/2026 (`CEFRJ_wordlist_ver1.6.zip`, sheet `ALL_sep`).

**Terms of use** (from the wordlist's own README sheet and the download page, checked 23 Oct 2026):

> The copyright of this wordlist belongs to Tono Laboratory at TUFS, but the list can be used for both research and commercial purposes with a proper acknowledgement of the source. The citation should be made as follows: The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from http:XXX on dd/mm/yy.

The Japanese terms on the download page add: the list is published free of charge and the project accepts no liability for its use; commercial use is free, and only supervision or consulting work by the lab is charged, by separate agreement; making a new list by modifying this one is allowed, as long as this list is properly cited. This file is such a modification, cited above and in the file's `source` field. The citation travels with the data; if the list ever ships inside an app or a service, its acknowledgements screen carries the same citation.

**What was changed:** each single-word headword (spelling variants split, as in `ALL_sep`) is lower-cased and kept at its easiest band across parts of speech (_book_ is A1 as a noun and B1 as a verb: A1). Multi-word entries (_ice cream_, _have to_) and entries with full stops (_a.m._) are left out. The parts of speech, the thematic categories and the Core Inventory and Threshold tags are not kept. Bands: A1 1,066 words, A2 1,229, B1 2,124, B2 2,462.

**Why this list:** it gives CEFR bands directly and allows commercial use and adaptation with a citation, with no share-alike terms. Not used: the English Vocabulary Profile (its licence doesn't allow bundling), the Oxford 3000/5000 (all rights reserved), and NGSL 1.2 (a frequency list with no CEFR bands, under share-alike terms). The CEFR-J list was built partly by comparison with the English Vocabulary Profile; the lab publishes it under the terms above.

## `town-words.json`: Yapling's own lists

Written for Yapling, no third-party content: Natterwick's names, town words and the cast's species (never counted against a band), spoken interjections with a band (_oh_, _wow_, _cheers_), the cast's light regional words (_lah_, _aiyah_, _shiok_), irregular forms mapped to their headwords, and the idioms the check looks for. Add to it when the check flags a name or misses an idiom.
