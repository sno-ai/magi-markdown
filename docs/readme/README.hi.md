# 📝 MDA Open Spec — एजेंट के लिए Markdown

> एजेंट-केंद्रित दस्तावेज़ों के लिए एक Markdown सुपरसेट। **एक स्रोत, अनेक लक्ष्य** — उन `.md` फ़ाइलों में कंपाइल करें जिन्हें हर प्रमुख एजेंट रनटाइम पहले से लोड करता है। **लोड के समय छेड़छाड़ का प्रमाण** — हर आर्टिफ़ैक्ट एक पुनरुत्पादनीय कंटेंट डाइजेस्ट लेकर चलता है, और साइन किए गए आर्टिफ़ैक्ट Sigstore-आधारित सिग्नेचर लेकर चलते हैं, ताकि न तो दस्तावेज़ लोड करने वाले एजेंट को और न ही समीक्षा करने वाले मनुष्य को किसी अनसाइन ब्लॉब पर भरोसा करना पड़े।

[![Latest release](https://img.shields.io/badge/release-v1.0.0--rc.3-blue)](https://github.com/sno-ai/mda/releases/tag/v1.0.0-rc.3)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-mda.sno.dev-3b82f6)](https://mda.sno.dev)
[![GitHub stars](https://img.shields.io/github/stars/sno-ai/mda?style=flat&color=yellow)](https://github.com/sno-ai/mda/stargazers)

**अन्य भाषाओं में पढ़ें:** [English](../../README.md) · [中文](README.zh-CN.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Русский](README.ru.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **हिन्दी**

## MDA क्या है

अब तक, आप वही एक स्किल चार-चार बार शिप करते थे। एक बार agentskills.io रनटाइम के लिए `SKILL.md` के रूप में। एक बार AAIF इकोसिस्टम के लिए `AGENTS.md` के रूप में। एक बार साइडकार JSON के साथ `MCP-SERVER.md` के रूप में। एक बार `CLAUDE.md` के रूप में। एक ही कंटेंट, चार अलग-अलग फ़्रंटमैटर आकार। एक को अपडेट करें, बाकी को भूल जाएँ, और एक महीने बाद वही चार फ़ाइलें चुपचाप चार थोड़े-थोड़े अलग निर्देश-दस्तावेज़ों में बदल चुकी होती हैं।

आप एक `.mda` लिखते हैं। बाकी कंपाइलर तैयार करता है।

![एक .mda स्रोत एक डिटरमिनिस्टिक पाइपलाइन के ज़रिए SKILL.md, AGENTS.md, MCP-SERVER.md और CLAUDE.md में कंपाइल होता है](../../images/hero-compile-pipeline.png)

```
                ┌─────────────────────────┐
                │   <name>.mda  (source)  │   ← MDA superset
                └────────────┬────────────┘
                             │  mda compile
                             ▼
   ┌─────────────────────────────────────────────────────────┐
   │ <name>/SKILL.md     (+ scripts/, references/, assets/)  │
   │ AGENTS.md                                               │
   │ <name>/MCP-SERVER.md  (+ mcp-server.json sidecar)       │
   │ CLAUDE.md                                               │
   └─────────────────────────────────────────────────────────┘
                       drop-in compatible
```

और वे चार फ़ाइलें यह नहीं बता सकतीं कि उन पर हस्ताक्षर किसने किए। `SKILL.md` लोड करने वाले एजेंट के पास यह सत्यापित करने का कोई तरीक़ा नहीं है कि कंटेंट वही है जो आपने लिखा था, और `AGENTS.md` की समीक्षा करने वाले क्यूरेटर के पास यह जानने का कोई तरीक़ा नहीं है कि मर्ज और लोड के बीच फ़ाइल किन-किन हाथों से होकर गुज़री। मानक फ़्रंटमैटर आकारों में कंटेंट डाइजेस्ट या सिग्नेचर रखने की कोई जगह ही नहीं, इसलिए भरोसे का फ़ैसला चुपचाप इस पर लौट आता है — "हम रिपो पर भरोसा करते हैं, किसी तरह।"

MDA फ़्रंटमैटर के भीतर ही एक JCS-कैनोनिकलाइज़्ड `integrity.digest` और DSSE-एनवेलप्ड, Sigstore-आधारित `signatures[]` लेकर चलता है। दोनों पक्ष — लोड के समय एजेंट और समीक्षा के समय मनुष्य — रिपो के बारे में किसी भावना के बजाय हाथ में मौजूद आर्टिफ़ैक्ट के विरुद्ध एक वास्तविक भरोसे का फ़ैसला कर सकते हैं। छेड़छाड़ का प्रमाण और साइनर-सत्यापन कॉन्ट्रैक्ट में ही आते हैं, बाद में जोड़े जाने वाले अंग के रूप में नहीं।

![मानक Markdown के ऊपर MDA की तीन अतिरिक्त चीज़ें: समृद्ध फ़्रंटमैटर, टाइप-निर्दिष्ट फ़ुटनोट संबंध, साइन की हुई पहचान](../../images/three-additions.png)

`.mda` मानक Markdown के ऊपर तीन चीज़ें जोड़ता है। तीनों वैकल्पिक।

1. **समृद्ध YAML फ़्रंटमैटर।** ओपन-स्टैंडर्ड `name` और `description` बेसलाइन के अलावा, MDA `doc-id`, `version`, `requires`, `depends-on`, `relationships`, और `tags` लेकर चलता है। एजेंट-जागरूक टूल इन्हें राउटिंग, डिपेंडेंसी रिज़ॉल्यूशन और ग्राफ़ ट्रैवर्सल के लिए उपयोग करते हैं। देखें [`spec/v1.0/02-frontmatter.md`](../../spec/v1.0/02-frontmatter.md) और [`spec/v1.0/10-capabilities.md`](../../spec/v1.0/10-capabilities.md)।
2. **टाइप-निर्दिष्ट फ़ुटनोट संबंध।** मानक Markdown फ़ुटनोट जिनका पेलोड एक JSON ऑब्जेक्ट है: `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`। कंपाइल पर बॉडी-क्रम में `metadata.mda.relationships` में मिरर किए जाते हैं। देखें [`spec/v1.0/03-relationships.md`](../../spec/v1.0/03-relationships.md)।
3. **क्रिप्टोग्राफ़िक पहचान।** एक JCS-कैनोनिकलाइज़्ड `integrity` डाइजेस्ट साथ ही DSSE-एनवेलप्ड, Sigstore-आधारित `signatures[]`। कंपाइल किया गया `.md` बिना किसी बाद के बोल्ट-ऑन के पुनरुत्पादनीय छेड़छाड़-डिटेक्शन लेकर चलता है। देखें [`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md) और [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md)।

केवल ओपन-स्टैंडर्ड फ़्रंटमैटर वाला एक `.mda` स्रोत बिना किसी बदलाव के `.md` में कंपाइल हो जाता है। MDA का जितना या जितना कम उपयोग आपकी परियोजना को चाहिए, उतना करें।

## यह क्यों मौजूद है

ईमानदार जवाब। मैं वही एक स्किल बार-बार चार बार शिप करता रहा। एक ही कंटेंट, चार रैपर। हर रनटाइम की अपनी राय थी कि शीर्ष पर कौन-सा फ़्रंटमैटर हो और किसे वेंडर-विशिष्ट गिना जाए। तीसरी या चौथी बार जब मैंने `SKILL.md` और `AGENTS.md` के बीच एक पैराग्राफ़ कॉपी-पेस्ट किया और फिर देखा कि वे आपस में बहक गए, तब मैंने यह लिखना शुरू किया।

बात यह है कि सबसे बुरा हिस्सा डुप्लिकेशन नहीं है। सबसे बुरा हिस्सा वह है जो आप उन फ़ॉर्मैट्स में से किसी में भी नहीं कह सकते। आप यह नहीं कह सकते कि "यह स्किल उस पर निर्भर है, संस्करण `^1.2.0`, इस कंटेंट डाइजेस्ट के साथ।" आप यह नहीं कह सकते कि "इस फ़ाइल पर इस पहचान ने इस Rekor इंडेक्स पर हस्ताक्षर किए।" आप यह नहीं कह सकते कि "इस दस्तावेज़ और उस दस्तावेज़ के बीच संबंध `supports` है, `cites` नहीं।" यह सूचना रखने की कोई जगह नहीं, इसलिए वह गद्य में पड़ी रहती है, जहाँ न एजेंट और न ही मनुष्य उस पर भरोसेमंद ढंग से कार्रवाई कर सकते हैं।

MDA उन चीज़ों को फ़्रंटमैटर और फ़ुटनोट में रखता है, ऐसे आकारों में जिन्हें एक JSON Schema सत्यापित कर सके। Markdown बॉडी अब भी रेंडर होती है। मानक फ़ील्ड अब भी लोड होते हैं। नया सब कुछ वैकल्पिक है। यही पूरी बात है।

विस्तृत संस्करण के लिए, दो दस्तावेज़ गहराई में जाते हैं। दोनों हर दावे को स्पेसिफ़िकेशन के किसी सेक्शन तक वापस ले जाते हैं, और दोनों इकोसिस्टम की मौजूदा कमियों को इनलाइन रेखांकित करते हैं। यदि आप अपनाने का निर्णय कर रहे हैं तो उन्हें पढ़ें।

- [**`docs/v1.0/ai-agent-core-value.md`**](../../docs/v1.0/ai-agent-core-value.md) — रनटाइम, हार्नेस, वैलिडेटर और डिस्पैचर के लिए तैयार किए गए पाँच बिंदु। MDA लोड के समय एक एजेंट को क्या देता है: टाइप्ड डिस्पैच के लिए संरचित `requires`, लोड पर सत्यापनीय भरोसा, मशीन-पठनीय ग्राफ़ एज, फ़ाइलनेम-आधारित वन-लुकअप टार्गेट डिस्पैच, और एजेंट-लिखित तथा कंपाइलर-निर्मित आउटपुट के लिए वही एक वैलिडेशन कॉन्ट्रैक्ट।
- [**`docs/v1.0/human-curator-user-core-value.md`**](../../docs/v1.0/human-curator-user-core-value.md) — एजेंट-केंद्रित निर्देश-लाइब्रेरियाँ लिखने और क्यूरेट करने वाले लोगों के लिए तैयार किए गए छह बिंदु। MDA शिप के समय लेखक को क्या देता है: एक स्रोत से अनेक इकोसिस्टम तक, छेड़छाड़ का प्रमाण और प्रकाशक की पहचान, मशीन-पठनीय डिपेंडेंसी ग्राफ़ और संस्करण-पिनिंग, हर रनटाइम का फ़्रंटमैटर सीखे बिना LLM-मध्यस्थ ऑथरिंग, छोटा (शून्य नहीं) वेंडर लॉक-इन, और सख़्त वैलिडेशन जो लगभग-कन्फ़ॉर्मेंट आर्टिफ़ैक्ट को शिप होने से पहले पकड़ ले।

## तीन ऑथरिंग मोड

MDA आर्टिफ़ैक्ट तीन तरह से बनाए जा सकते हैं। वैलिडेशन के तहत वे समतुल्य हैं।

1. **एजेंट मोड** — एक AI एजेंट सीधे `.md` लिखता है। प्राथमिक निकट-भविष्य का उपयोग।
2. **ह्यूमन मोड** — एक मनुष्य सीधे `.md` लिखता है, integrity जोड़ता है, और DSSE/Rekor-सक्षम signing path से उसे sign करता है।
3. **कंपाइल्ड मोड** — लेखक एक `.mda` स्रोत लिखता है; MDA कंपाइलर एक या अधिक `.md` आउटपुट तैयार करता है।

आप जो भी राह चुनें, आर्टिफ़ैक्ट को उसी एक JSON Schema 2020-12 टार्गेट स्कीमा और उसी एक कन्फ़ॉर्मेंस स्यूट के विरुद्ध परखा जाता है। "यह तो एजेंट से आया है" के लिए कोई दूसरा कोड पथ नहीं है।

रेफ़रेंस CLI के बिना मैनुअल और एजेंट-लिखित रास्तों के लिए देखें [`docs/create-sign-verify-mda.md`](../../docs/create-sign-verify-mda.md), और प्राथमिकता तथा मोड के नॉर्मेटिव कथन के लिए देखें [`spec/v1.0/00-overview.md §0.5–§0.6`](../../spec/v1.0/00-overview.md)।

## न्यूनतम उदाहरण

`pdf-tools.mda`:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
metadata:
  mda:
    doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
    title: PDF Tools
    version: "1.2.0"
    tags: [pdf, extraction]
---

# PDF Tools

…
```

`pdf-tools/SKILL.md` में कंपाइल होता है। स्रोत पहले से ही सख़्त टार्गेट आकार में है, हर MDA-विस्तारित फ़ील्ड `metadata.mda.*` के नीचे नेस्टेड है, इसलिए कंपाइल मूलतः एक रीनेम है। और भी विस्तृत उदाहरण [`examples/`](../../examples/) और [`docs/mda-examples/`](../../docs/mda-examples/) में हैं।

## संगतता

एक कंपाइल किया हुआ `SKILL.md` प्रमुख agentskills.io v1 कंज़्यूमर्स द्वारा लोड किया जा सकता है:

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf**, और अन्य 2026 SKILL.md कंज़्यूमर

एक कंपाइल किया हुआ `AGENTS.md` AAIF-संरेखित इकोसिस्टम (Linux Foundation की Agentic AI Foundation) में बैठता है: Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory।

प्रति-वेंडर एक्सटेंशन आरक्षित `metadata.<vendor>.*` नेमस्पेस के तहत रहते हैं। लोडर केवल अपना नेमस्पेस पढ़ते हैं, और कंज़्यूमर्स को किसी दस्तावेज़ को इस आधार पर अकेले अस्वीकार नहीं करना चाहिए कि वह कोई अपंजीकृत नेमस्पेस लेकर चल रहा है। नेमस्पेस रजिस्ट्री, मानक `requires` कुंजियों, आरक्षित Sigstore OIDC इशुअर्स, और आरक्षित DSSE `payload-type` मानों के लिए देखें [`REGISTRY.md`](../../REGISTRY.md)।

## Open Spec

नॉर्मेटिव MDA Open Spec [**SPEC.md**](../../SPEC.md) → [`spec/v1.0/`](../../spec/v1.0/) पर रहता है।

- [§00 Overview](../../spec/v1.0/00-overview.md) — पारिभाषिक शब्द, RFC 2119, P0 > P1 > P2 प्राथमिकता, तीन ऑथरिंग मोड, गवर्नेंस, वर्ज़निंग
- [§01 Source and output](../../spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](../../spec/v1.0/02-frontmatter.md)
- [§03 Relationships](../../spec/v1.0/03-relationships.md) — फ़ुटनोट + `depends-on` + version/digest पिनिंग
- [§04 Platform namespaces](../../spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive disclosure](../../spec/v1.0/05-progressive-disclosure.md)
- [§06 Target schemas](../../spec/v1.0/06-targets/) — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, `CLAUDE.md`
- [§07 Conformance](../../spec/v1.0/07-conformance.md)
- [§08 Integrity](../../spec/v1.0/08-integrity.md)
- [§09 Signatures](../../spec/v1.0/09-signatures.md) — Sigstore OIDC डिफ़ॉल्ट, did:web फ़ॉलबैक
- [§10 Capabilities](../../spec/v1.0/10-capabilities.md) — `metadata.mda.requires`
- [§11 Implementer's Guide](../../spec/v1.0/11-implementer-guide.md) (इन्फ़ॉर्मेटिव)
- [§12 Sigstore tooling integration](../../spec/v1.0/12-sigstore-tooling.md) (इन्फ़ॉर्मेटिव)
- [§13 Trusted Runtime Profile](../../spec/v1.0/13-trusted-runtime.md) — production verification और trust policy

JSON Schemas [`schemas/`](../../schemas/) में रहते हैं — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, `mda-trust-policy`, साथ ही `integrity`, `signature`, `requires`, `depends-on`, और `version-range` के लिए साझा `_defs/`। कन्फ़ॉर्मेंस फ़िक्स्चर और वैलिडेशन रनर [`conformance/`](../../conformance/) में रहते हैं (`node scripts/validate-conformance.mjs`)।

## रेफ़रेंस इम्प्लीमेंटेशन

TypeScript CLI [`apps/cli/`](../../apps/cli/) में रहता है (npm पैकेज: `@markdown-ai/cli`)। आर्किटेक्चर स्पेक है [`apps/cli/IMPL-SPEC.md`](../../apps/cli/IMPL-SPEC.md)। CLI `v1.0.0-rc.N` टैगों में परिपक्व होता जाता है। अंतिम `1.0.0` तब आता है जब CLI कन्फ़ॉर्मेंस स्यूट का 100% पास कर ले।

![v1.0 कॉन्ट्रैक्ट शिप करता है — schemas, conformance, और कंपाइलर — verifier, resolver, registry, ग्राफ़ इंडेक्सर और रनटाइम राउटिंग को भविष्य के इकोसिस्टम-कार्य के रूप में](../../images/status-contract-and-ecosystem.png)

## स्थिति, ईमानदारी से

v1.0 **कॉन्ट्रैक्ट** शिप करता है, उसके चारों ओर का पूरा इकोसिस्टम नहीं।

**आज क्या काम करता है:** आप एक `.mda` लिख सकते हैं, उसे एक या अधिक कन्फ़ॉर्मेंट `.md` आउटपुट में कंपाइल कर सकते हैं, और उन्हें टार्गेट JSON Schemas तथा कन्फ़ॉर्मेंस स्यूट के विरुद्ध वैलिडेट कर सकते हैं।

**अभी क्या बनाया जा रहा है:**

- सिग्नेचर के लिए एक बंडल किया हुआ verifier अभी शिप नहीं हुआ है। ऑपरेटर फ़िलहाल JCS लाइब्रेरी को DSSE/Rekor-सक्षम Sigstore signing और verification tools से जोड़ते हैं।
- एक काम करने वाला डिपेंडेंसी रिज़ॉल्वर और एक केंद्रीय आर्टिफ़ैक्ट रजिस्ट्री अभी अस्तित्व में नहीं हैं।
- `metadata.mda.relationships` को उपयोग करने वाला ग्राफ़ इंडेक्सर शिप नहीं हुआ है।
- आज तक यह ज्ञात नहीं है कि कोई 2026 मल्टी-एजेंट हार्नेस `metadata.mda.requires` के माध्यम से रूट करता हो।
- v1.0 agentskills.io और AAIF सबसेट को कवर करता है। यह Cursor MDC, Windsurf rules, Continue, Aider, या `*.instructions.md` को टार्गेट नहीं करता। उन्हें अभी भी समानांतर रखरखाव की आवश्यकता है।

जो `.mda` आप आज लिखते हैं वह अब भी ऐसे कन्फ़ॉर्मेंट `.md` आउटपुट तैयार करता है जो ऊपर सूचीबद्ध हर रनटाइम में लोड होते हैं। verification, resolution और ग्राफ़-ट्रैवर्सल के टुकड़े प्रगति पर हैं। वह कॉन्ट्रैक्ट जो उन्हें बिना किसी आगे की बातचीत के बनने देता है — वही v1.0 फ़्रीज़ करता है।

स्पेक और कंज़्यूमर-साइड इकोसिस्टम के बीच की पूरी खाई के लिए देखें [`docs/v1.0/what-v1.0-does-not-ship.md`](../../docs/v1.0/what-v1.0-does-not-ship.md)। यह अंतर — एक ईमानदार स्पेक-फ़्रीज़ और मार्केटिंग-फ़्रीज़ के बीच — वही है जिसे यह परियोजना बनाए रखने की कोशिश करती है।

## योगदान

योगदान का स्वागत है। Open Spec या वेंडर रजिस्ट्री में बड़े बदलावों की शुरुआत कोड से पहले चर्चा के रूप में होनी चाहिए। देखें [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md), और [`SECURITY.md`](../../SECURITY.md)। वेंडर नेमस्पेस आबंटन के लिए देखें [`REGISTRY.md`](../../REGISTRY.md)। हाल के बदलाव [`CHANGELOG.md`](../../CHANGELOG.md) में दर्ज हैं।

## लाइसेंस

- Open Spec कंटेंट (`spec/`, `REGISTRY.md`, `SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schemas (`schemas/`), टूलिंग, और रेफ़रेंस इम्प्लीमेंटेशन: [Apache-2.0](../../LICENSE)

## संबंधित लिंक

- डॉक्यूमेंटेशन साइट: https://mda.sno.dev
- स्पेक चर्चा: https://github.com/sno-ai/mda/discussions
