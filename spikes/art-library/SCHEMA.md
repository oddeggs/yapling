# Catalogue entry (one per asset), JSON

Prop:
{
  "id": "pho-bowl",                 // kebab-case, unique, stable; also the A.PROPS key
  "kind": "prop",
  "word": "bowl of pho",            // the English vocabulary item the prop teaches (noun phrase as a learner would say it)
  "headword": "bowl",               // the base dictionary word for the CEFR lookup
  "pos": "noun",
  "vi": "bát phở",                  // Vietnamese gloss (natural, everyday; northern spelling, note southern if different)
  "category": "food-drink",         // food-drink | kitchen | office | travel | nature | clothing | furniture | tech | festival | home | transport | school | health | sport
  "cefr": "A1",                     // band of the headword (Cambridge/English Vocabulary Profile style), A1..C1
  "places": ["cafe","market","kitchen","street"],   // scene types it fits
  "seasons": ["any"],               // any | spring | summer | autumn | winter | tet | mid-autumn
  "tod": ["any"],                   // any | morning | afternoon | dusk | night
  "size": "S",                      // S (box 60) | M (96) | L (160)
  "box": 60, "anchor": [30, 56],    // ground-contact point in box units
  "surfaces": ["table","counter","shelf"],          // where it can stand in a scene: table | counter | shelf | floor | ground | wall | hand | bench | stall
  "variants": { "v": ["white","cyan"], "season": [], "tod": [] },   // parameter values the generator supports
  "tags": ["hot","noodles","breakfast","vietnam"],   // what a story agent searches by (theme, feeling, situation)
  "fn": "s_prop", "o": { "id": "pho-bowl" },
  "status": "draft"                 // draft | review | approved
}

Scene:
{
  "id": "market-stall", "kind": "scene", "name": "fruit stall at the market", "vi": "sạp trái cây ở chợ",
  "place": "market", "indoor": false,
  "tod": ["morning","afternoon","dusk"], "seasons": ["any","tet"], "weather": ["clear","rain"],
  "fn": "s_market", "front": "s_market (layer: front)" or null,
  "anchors": { "stall-l": { "xy": [80, 430], "scale": 1, "surfaces": "stall", "sizes": ["S"] } },
  "tags": ["shopping","bargaining","numbers","food"],
  "status": "draft"
}
