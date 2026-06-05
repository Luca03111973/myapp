// ===========================================================================
// MOTORE CDSS: REGOLE DI SICUREZZA E INDIRIZZAMENTO TERAPEUTICO AUTOMATICO
// ===========================================================================
VARIABILI DI STATO GLOBALI (Inizializzazione sicura sull'oggetto window) window.mappaDoloreDati = window.mappaDoloreDati || {}; window.scoreDN4Dati = window.scoreDN4Dati || {}; window.scoreCSIDati = window.scoreCSIDati || {}; window.scoreZungAnsiaDati = window.scoreZungAnsiaDati || {}; window.scoreZungDepxDati = window.scoreZungDepxDati || {}; window.farmaciSelezionati = window.farmaciSelezionati || []; // Array fondamentale per la sicurezza

// 1. ESTRAZIONE DEI DATI DI CONTESTO E COSTRUZIONE DEL REPORT DIAGNOSTICO
function eseguiCalcoloReportCDSS() {
  const output = document.getElementById("output-clinico-testuale");
  if (!output) return;

  const eGFRVal = parseFloat(document.getElementById("egfrOutput").value) || 0;
  const etaPaziente =
    parseInt(document.getElementById("etaPaziente").value) || 0;

  let totDN4 = Object.values(scoreDN4Dati).reduce((a, b) => a + b, 0);
  let totCSI = Object.values(scoreCSIDati).reduce((a, b) => a + b, 0);
  let totAnsia = Object.values(scoreZungAnsiaDati).reduce((a, b) => a + b, 0);
  let totDepr = Object.values(scoreZungDepxDati).reduce((a, b) => a + b, 0);

  let numAree = Object.keys(mappaDoloreDati).length;
  let vasMax = 0;
  let maxMeccanico = 0;
  let maxInfiammatorio = 0;
  let durationDoloreCronico = false;

  const inputDurata = document.getElementById("durata-dolore");
  if (inputDurata) {
    durationDoloreCronico = inputDurata.value === "cronico";
  }

  for (let chiave in mappaDoloreDati) {
    const dist = mappaDoloreDati[chiave];
    if (dist.vas > vasMax) vasMax = dist.vas;
    if (dist.meccanico > maxMeccanico) maxMeccanico = dist.meccanico;
    if (dist.infiammatorio > maxInfiammatorio)
      maxInfiammatorio = dist.infiammatorio;
  }

  const hasIPB = haComorbilitadiNome("Iperplasia Prostatica Benigna");
  const hasCardiopatia =
    haComorbilitadiNome("Cardiopatia Ischemica") ||
    haComorbilitadiNome("Scompenso Cardiaco");
  const hasFibrosiPolmonare = haComorbilitadiNome("Fibrosi Polmonare");
  const hasBPCO =
    haComorbilitadiNome("Asma Bronchiale") || haComorbilitadiNome("BPCO");
  const isTrigeminale =
    mappaDoloreDati["t-trigemino"] ||
    haComorbilitadiNome("Nevralgia del Trigemino");

  // DEFINIZIONE DEI CRITERI PER I SINGOLI MECCANISMI
  const isNeuropatico = totDN4 >= 4;
  const isNociplastico = totCSI >= 8 || numAree >= 3;
  const isNocicettivo = maxInfiammatorio >= 3 || maxMeccanico >= 3;

  // LOGICA DI CRITERIO: DIAGNOSI DI DOLORE MISTO
  let diagnosiMisto = "Assente (Monocomponente)";
  if (isNocicettivo && isNeuropatico) {
    diagnosiMisto =
      "<span style='color: var(--danger); font-weight: bold;'>Presente (Misto: Nocicettivo + Neuropatico)</span>";
  } else if (isNeuropatico && isNociplastico) {
    diagnosiMisto =
      "<span style='color: var(--danger); font-weight: bold;'>Presente (Misto: Neuropatico + Nociplastico)</span>";
  } else if (isNociplastico && isNocicettivo) {
    diagnosiMisto =
      "<span style='color: var(--danger); font-weight: bold;'>Presente (Misto: Nociplastico + Nocicettivo)</span>";
  }

  let farmacoScelto = "";
  let categoriaFarmaco = "";
  let motivazioneClinica = "";
  let noteCautela = "";

  // INTERCETTAZIONE PREVENTIVA REALE DELLE INTERAZIONI
  const isAntidepressivoAttivo = haAntidepressivoAttivo();
  const isSSRIoSNRI = haSSRIoSNRIAttivo();
  const isTramadoloAttivo = haTramadoloAttivo();

  // OVERRIDE PRIMARIO: NEVRALGIA TRIGEMINALE
  if (isTrigeminale) {
    categoriaFarmaco =
      "Antiepilettico Specifico (Target Nevralgia Trigeminale)";
    farmacoScelto =
      "<b>Carbamazepina</b> (Start: 100-200 mg 1-2 volte al giorno, con successiva titolazione graduale).";
    motivazioneClinica =
      "Linea terapeutica elettiva e di prima scelta automatizzata per riscontro di sintomatologia parossistica o diagnosi di Nevralgia del Trigemino.";
    noteCautela =
      " ⚠️  <span style='color: var(--warning); font-weight: bold;'>MONITORAGGIO OBBLIGATORIO:</span> <i>Eseguire controllo periodico dell'emocromo completo (rischio leucopenia) e della sodiemia (rischio iponatremia da SIADH).</i>";
  }

  // -------------------------------------------------------------------------
  // CASO A: DOLORE MISTO (NEUROPATICO + NOCICETTIVO)
  // -------------------------------------------------------------------------
  else if (isNeuropatico && isNocicettivo) {
    categoriaFarmaco =
      "Dolore Misto (Componente Neuropatica Periferica + Componente Nocicettiva Infiammatoria)";
    let baseNeuropatica =
      eGFRVal < 60
        ? "Pregabalin/Gabapentin a dosaggio ridotto per ridotta clearance renale"
        : "Pregabalin (75mg x2/die) o Gabapentin (300mg x3/die)";
    let coperturaInfiammatoria =
      eGFRVal >= 60 && !hasCardiopatia
        ? " + <b>FANS (es. Naprossene o Ibuprofene)</b> a cicli brevi (5-7 gg)"
        : " + <b>Paracetamolo 1g</b> ad orari fissi (FANS omessi per salvaguardia organo)";

    if (isAntidepressivoAttivo || isSSRIoSNRI || isTramadoloAttivo) {
      farmacoScelto = `<span style='color: var(--success); font-weight: bold;'> 🛡️  Linea Protetta da Interazioni:</span> <b>${baseNeuropatica}</b>${coperturaInfiammatoria}.<br> ➕  Supporto bio-strutturale associato: <b>PEA + Acido  α -Lipoico</b>.`;

      // Controllo incrociato di sicurezza per la Rescue Drug
      if (vasMax >= 8 && !hasFibrosiPolmonare) {
        if (isSSRIoSNRI || isTramadoloAttivo) {
          farmacoScelto +=
            "<br> ➕  Soccorso analgesico (Rescue Drug): <b style='color:var(--warning);'>Tapentadolo</b> al bisogno (Tramadolo omesso protettivamente).";
        } else {
          farmacoScelto +=
            "<br> ➕  Soccorso analgesico (Rescue Drug): <b>Tapentadolo</b> o <b>Tramadolo</b> al bisogno per i picchi algici.";
        }
      }

      motivazioneClinica =
        "Rilevata terapia concomitante o farmaco a rischio cinetico/serotoninergico (SSRI/SNRI/Tramadolo). Omissione protettiva assoluta di Amitriptilina (TCA) e Duloxetina (SNRI) per prevenire crisi serotoninergiche e tossicità da accumulo farmacocinetico. Configurato approccio basato unicamente su gabapentinoidi idrofili e co-analgesici periferici.";
      noteCautela +=
        " ⚠️  <span style='color: var(--danger); font-weight: bold;'>BLOCCO DI SICUREZZA CRITICO CDSS: Amitriptilina (TCA) e Duloxetina (SNRI) permanentemente omesse dall'algoritmo per co-prescrizione ad alto rischio di Sindrome Serotoninergica o accumulo.</span>";
    } else {
      if (hasIPB || hasCardiopatia || etaPaziente >= 65) {
        farmacoScelto = `<b>${baseNeuropatica}</b> + <b>Duloxetina (SNRI)</b> (30-60 mg/die)${coperturaInfiammatoria}.<br> ➕  Supporto bio-strutturale associato: <b>PEA + Acido  α -Lipoico</b>.`;
      } else {
        farmacoScelto = `<b>${baseNeuropatica}</b> + <b>Amitriptilina (TCA)</b> (basse dosi serali)${coperturaInfiammatoria}.<br> ➕  Supporto bio-strutturale associato: <b>PEA + Acido  α -Lipoico</b>.`;
      }
      if (vasMax >= 8 && !hasFibrosiPolmonare)
        farmacoScelto +=
          "<br> ➕  Soccorso analgesico (Rescue Drug): <b>Tapentadolo</b> o <b>Tramadolo</b> al bisogno.";
      motivazioneClinica =
        "Approccio combinato multimodale standard: down-regulation neuronale tramite legame ai canali del calcio α2δ centrali e ripristino delle vie inibitorie discendenti monoaminergiche.";
    }
  }

  // -------------------------------------------------------------------------
  // CASO B: DOLORE MISTO (NOCICETTIVO + NOCIPLASTICO)
  // -------------------------------------------------------------------------
  else if (isNocicettivo && isNociplastico) {
    categoriaFarmaco =
      "Dolore Misto (Componente Nocicettiva Infiammatoria + Componente Nociplastica da Sensibilizzazione)";
    let gestioneFANS =
      eGFRVal >= 60 && !hasCardiopatia
        ? " + <b>FANS al bisogno</b> mirati esclusivamente durante i flare-up."
        : " + <b>Paracetamolo 1g continuativo</b> (FANS interdetti).";
    let miorilassante = !hasBPCO
      ? " + <b>Ciclobenzaprina</b> serale per contrastare la contrattura muscolare riflessa"
      : "";

    if (isAntidepressivoAttivo || isSSRIoSNRI || isTramadoloAttivo) {
      farmacoScelto = `<span style='color: var(--success); font-weight: bold;'> 🛡️  Background Mantenuto:</span> Terapia ad azione centrale in uso lasciata inalterata come neuromodulazione${gestioneFANS}${miorilassante}.<br> ➕  Modulazione di membrana: <b>Palmitoiletanolamide (PEA)</b>.`;
      motivazioneClinica =
        "Rilevato trattamento attivo correlato. La co-prescrizione di Amitriptilina o ulteriori SNRI analgesici è interdetta dal CDSS per azzerare il rischio di tossicità cumulativa o sindrome serotoninergica. Si delega la neuromodulazione alla terapia già in corso.";
      noteCautela +=
        " ⚠️  <span style='color: var(--danger); font-weight: bold;'>BLOCCO DI SICUREZZA CRITICO CDSS: Co-prescrizione di Amitriptilina (TCA) o Duloxetina (SNRI) bloccata. Il paziente assume già un farmaco ad attività serotoninergica/monoaminergica.</span>";
    } else {
      let lineaCentrale =
        hasIPB || hasCardiopatia || etaPaziente >= 65
          ? "<b>Duloxetina (SNRI)</b> 60 mg/die"
          : "<b>Amitriptilina (TCA)</b> a basse dosi serali o <b>Duloxetina (SNRI)</b>";
      farmacoScelto = `${lineaCentrale}${gestioneFANS}${miorilassante}.<br> ➕  Modulazione neuro-infiammatoria: <b>PEA</b>.`;
      motivazioneClinica =
        "Strategia mirata al potenziamento dei sistemi inibitori centrali carenti (quota nociplastica) in sinergia con un controllo antiflogistico o analgesico basale.";
    }
  }

  // -------------------------------------------------------------------------
  // CASO C: DOLORE MISTO (NOCIPLASTICO + NEUROPATICO)
  // -------------------------------------------------------------------------
  else if (isNociplastico && isNeuropatico) {
    categoriaFarmaco =
      "Dolore Misto (Sensibilizzazione Centrale Dominante + Danno Neuropatico Strutturale)";
    let gabaTitolazione =
      eGFRVal < 60
        ? "<b>Pregabalin/Gabapentin</b> titolati con estrema prudenza e adattati alla clearance renale"
        : "<b>Pregabalin</b> (fino a 150-300 mg/die) o <b>Gabapentin</b> a dosaggio pieno";

    if (isAntidepressivoAttivo || isSSRIoSNRI || isTramadoloAttivo) {
      farmacoScelto = `<span style='color: var(--success); font-weight: bold;'> 🛡️  Strategia Monotarget Sicura:</span> ${gabaTitolazione}.<br> ➕  Co-analgesia neurotrofica: <b>PEA + Acido  α -Lipoico + Vitamine gruppo B</b>.`;
      if (vasMax >= 8 && !hasFibrosiPolmonare)
        farmacoScelto +=
          "<br> ➕  Farmaco di salvataggio: <b>Tapentadolo</b> per via del suo duplice meccanismo d'azione sincrono e sicuro.";

      motivazioneClinica =
        "Grave quadro combinato. Il trattamento concomitante registrato impedisce tassativamente l'aggiunta di Amitriptilina o Duloxetina per scongiurare crisi serotoninergiche. Si adotta una strategia basata unicamente sulla titolazione mirata di gabapentinoidi idrofili e nutraceutica strutturale.";
      noteCautela +=
        " ⚠️  <span style='color: var(--danger); font-weight: bold;'>SINDROME SEROTONINERGICA PREVENUTA: Interdetta l'aggiunta di Amitriptilina/Duloxetina a causa della terapia concomitante. I canali idrofili del calcio restano l'unico target neuronale sicuro.</span>";
    } else {
      if (hasIPB || hasCardiopatia || etaPaziente >= 65) {
        farmacoScelto = `${gabaTitolazione} + <b>Duloxetina (SNRI)</b> 60 mg/die.<br> ➕  Co-analgesia neurotrofica: <b>PEA + Acido  α -Lipoico + Vitamine gruppo B</b>.`;
      } else {
        farmacoScelto = `${gabaTitolazione} + <b>Amitriptilina (TCA)</b> (10-25 mg serali).<br> ➕  Co-analgesia neurotrofica: <b>PEA + Acido  α -Lipoico + Vitamine gruppo B</b>.`;
      }
      if (vasMax >= 8 && !hasFibrosiPolmonare)
        farmacoScelto += "<br> ➕  Farmaco di salvataggio: <b>Tapentadolo</b>.";
      motivazioneClinica =
        "Sinergia d'azione classica tra ligandi α2δ e inibitori della ricaptazione delle monoamine per la massima down-regulation neuronale.";
    }
  }

  // -------------------------------------------------------------------------
  // CASO D: DOLORE NEUROPATICO PURO
  // -------------------------------------------------------------------------
  else if (isNeuropatico) {
    if (numAree === 1) {
      categoriaFarmaco = "Dolore Neuropatico Periferico Focale Circoscritto";
      farmacoScelto =
        "<b>Lidocaina cerotto 5%</b> (applicazione locale topica 12h/die) oppure <b>Capsaicina cerotto 8%</b>.<br> ➕  Co-Analgesia: <b>PEA + Vitamina B</b>.";
      motivazioneClinica =
        "Localizzazione anatomica strettamente circoscritta; l'approccio topico massimizza l'efficacia azzerando la tossicità sistemica.";
    } else {
      categoriaFarmaco = "Dolore Neuropatico Sistemico / Polidistrettuale";
      let lineaSistemica =
        eGFRVal >= 60
          ? "<b>Pregabalin</b> (75 mg 2 volte/die) o <b>Gabapentin</b> (300 mg 3 volte/die)"
          : "<b>Pregabalin / Gabapentin (ADATTAMENTO NEFROLOGICO OBBLIGATORIO)</b> ridotto in base all'eGFR.";

      if (isAntidepressivoAttivo || isSSRIoSNRI || isTramadoloAttivo) {
        farmacoScelto = `<span style='color: var(--success); font-weight: bold;'> 🛡️  Strategia Isolata Sicura:</span> ${lineaSistemica}.<br> ➕  Integrazione: <b>PEA + Vitamina B</b>.`;
        if (vasMax >= 8 && !hasFibrosiPolmonare)
          farmacoScelto +=
            "<br> ➕  Soccorso analgesico integrato: <b>Tapentadolo</b> al bisogno (Evitato Tramadolo se già in uso o in combinazione a SSRI).";

        motivazioneClinica =
          "Danno polidistrettuale neuropatico gestito escludendo in modo assoluto Amitriptilina o Duloxetina. La presenza di un farmaco interferente rende i gabapentinoidi idrofili l'unica scelta sistemica esente da interazioni metaboliche pericolose.";
        noteCautela +=
          " ⚠️  <span style='color: var(--danger); font-weight: bold;'>AVVISO DI SICUREZZA: Omissione protettiva totale di Amitriptilina (TCA) e Duloxetina (SNRI) attivata a causa della terapia concomitante rilevata nel sistema.</span>";
      } else {
        if (!hasIPB && !hasCardiopatia && etaPaziente < 65) {
          farmacoScelto = `${lineaSistemica} in associazione a <b>Amitriptilina (TCA)</b> a basse dosi serali.<br> ➕  Integrazione: <b>PEA + Vitamina B</b>.`;
        } else {
          farmacoScelto = `${lineaSistemica} in associazione a <b>Duloxetina (SNRI)</b> 30-60 mg/die.<br> ➕  Integrazione: <b>PEA + Vitamina B</b>.`;
        }
        if (vasMax >= 8 && !hasFibrosiPolmonare)
          farmacoScelto +=
            "<br> ➕  Soccorso analgesico integrato: <b>Tramadolo</b> o <b>Tapentadolo</b> al bisogno.";
        motivazioneClinica =
          "Necessità di un approccio farmacologico sistemico combinato.";
      }

      if (vasMax >= 8 && hasFibrosiPolmonare) {
        noteCautela +=
          " ⚠️  <span style='color: var(--warning);'>CAUTELA RESPIRATORIA:</span> <i>Prescrizione di oppioidi centrali evitata per la presenza concomitante di Fibrosi Polmonare cronica.</i>";
      }
    }
  }

  // -------------------------------------------------------------------------
  // CASO E: DOLORE NOCIPLASTICO PURO
  // -------------------------------------------------------------------------
  else if (isNociplastico) {
    categoriaFarmaco =
      "Dolore Nociplastico (Sensibilizzazione Centrale Dominante)";
    let miorilassanteScelto = hasBPCO
      ? ""
      : " + <b>Ciclobenzaprina</b> o <b>Tizanidina</b> alla sera";
    if (hasBPCO)
      noteCautela +=
        " ⚠️  <span style='color: var(--warning);'>RESTRIZIONE FARMACI:</span> <i>Miorilassanti ad azione centrale esclusi a causa della concomitanza di patologia respiratoria ostruttiva cronica (BPCO/Asma).</i>";

    let lineaSensibilizzazione =
      eGFRVal < 60
        ? "<b>Pregabalin / Gabapentin (Dosaggi minimi adattati alla clearance renale)</b>"
        : "<b>Pregabalin / Gabapentin</b> a bassi dosaggi.";

    if (isAntidepressivoAttivo || isSSRIoSNRI || isTramadoloAttivo) {
      farmacoScelto = `<span style='color: var(--success); font-weight: bold;'> 🛡️  Strategia Selettiva Sicura:</span> ${lineaSensibilizzazione}${miorilassanteScelto}.<br> ➕  Stabilizzazione di membrana extra-target: <b>PEA</b>.`;
      motivazioneClinica =
        "Modulazione dell'iperalgesia diffusa nociplastica affidata ai gabapentinoidi idrofili e alla PEA; l'aggiunta di molecole tricicliche (Amitriptilina) o SNRI (Duloxetina) è vietata dal CDSS per non generare interazioni cumulative.";
      noteCautela +=
        " ⚠️  <span style='color: var(--danger); font-weight: bold;'>ALERT MODULAZIONE CENTRALIZZATA: Amitriptilina e Duloxetina bloccate dal CDSS per prevenire sindromi ed eventi avversi neuro-comportamentali cumulativi o serotoninergici.</span>";
    } else {
      if (hasIPB || hasCardiopatia || etaPaziente >= 65) {
        farmacoScelto = `<b>Duloxetina (SNRI)</b> 60 mg/die oppure ${lineaSensibilizzazione}${miorilassanteScelto}.<br> ➕  Stabilizzazione di membrana extra-target: <b>PEA</b>.`;
      } else {
        farmacoScelto = `<b>Amitriptilina (TCA)</b> (titolazione lenta in gocce serali) oppure <b>Duloxetina (SNRI)</b>, in combinazione flessibile con ${lineaSensibilizzazione}${miorilassanteScelto}.<br> ➕  Stabilizzazione di membrana: <b>PEA</b>.`;
      }
      motivazioneClinica =
        "Indirizzo terapeutico volto al ripristino del tono inibitorio discendente monoaminergico.";
    }
  }

  // -------------------------------------------------------------------------
  // CASO F: DOLORE NOCICETTIVO INFIAMMATORIO (ACUTO / CRONICO)
  // -------------------------------------------------------------------------
  else if (isNocicettivo && !durationDoloreCronico) {
    categoriaFarmaco = "Dolore Nocicettivo Infiammatorio Acuto";
    if (eGFRVal >= 60 && !hasCardiopatia) {
      if (vasMax >= 8) {
        if (!hasFibrosiPolmonare) {
          farmacoScelto =
            "Opzioni sistemiche ad alta potenza d'urto: <b>Glucocorticoidi</b> (es. Prednisone o Metilprednisolone a scalare) OPPURE <b>Morfina</b> o <b>Ossicodone</b> a dosaggi minimi d'attacco.";
          motivazioneClinica =
            "Grave quadro infiammatorio o lesionale acuto iperalgesico ad intensità severa (VAS ≥ 8).";
        } else {
          farmacoScelto =
            "<b>Glucocorticoidi</b> (es. Prednisone o Metilprednisolone) a scalare terapeutico controllato.";
          motivazioneClinica =
            "Scelta protettiva del CDSS: evitati gli oppioidi maggiori per preservare l'efficienza respiratoria periferica.";
          noteCautela +=
            " ⚠️  <span style='color: var(--warning);'>ALERT RESPIRATORIO:</span> <i>Oppioidi maggiori d'urto rimossi dalle opzioni terapeutiche a causa del riscontro anamnestico di Fibrosi Polmonare attiva.</i>";
        }
      } else {
        farmacoScelto =
          "FANS ad azione rapida a scelta tra: <b>Ibuprofene</b> (400-600 mg), <b>Diclofenac</b> (50-75 mg) o <b>Naprossene</b> per un ciclo massimo tassativo di 5-7 giorni.";
        motivazioneClinica =
          "Terapia antiflogistica classica di prima linea ad azione periferica mirata.";
      }
    } else {
      if (vasMax >= 8 && !hasFibrosiPolmonare) {
        farmacoScelto =
          "FANS e Glucocorticoidi controindicati per insufficienza d'organo o rischio emodinamico. Configurato oppioide forte di sicurezza: <b>Morfina</b> o <b>Idromorfone</b> a dosaggi minimi controllati.";
        motivazioneClinica =
          "Modifica protettiva automatizzata del CDSS per superare le restrizioni metaboliche cardiovascolari o renali.";
      } else {
        farmacoScelto =
          "Controindicazione clinica multiorgano all'uso di FANS, Cortisonici e Oppioidi. Somministrare <b>Paracetamolo</b> 1g (fino a un massimo di 3g/die) come base analgesica pura.";
        motivazioneClinica =
          "Paziente ad altissimo rischio di tossicità d'organo incrociata.";
      }
    }
  } else {
    categoriaFarmaco = "Dolore Nocicettivo Infiammatorio Cronico";
    let fansCicli =
      eGFRVal >= 60 && !hasCardiopatia
        ? " + <b>FANS a brevi cicli controllati</b> esclusivamente in caso di riacutizzazione sintomatologica (flare-up)"
        : " (Uso di FANS permanentemente escluso per profilo di rischio renale/cardiaco cronico)";

    if (vasMax >= 8) {
      if (!hasFibrosiPolmonare) {
        farmacoScelto =
          "Terapia oppioide maior strutturata a rilascio prolungato: <b>Ossicodone</b> o <b>Fentanyl (cerotto transdermico)</b>.<br> ➕  Terapia base sinergica: <b>Paracetamolo</b> 1g ad orari fissi.";
        motivazioneClinica =
          "Progressione terapeutica obbligatoria verso il terzo gradino della scala OMS for dolore refrattario cronico severo.";
      } else {
        let alternativaFansFlusso =
          eGFRVal >= 60 && !hasCardiopatia
            ? "<br> ➕  In caso di riacutizzazione: <b>FANS a cicli brevissimi (3-5 giorni)</b> con attenta gastroprotezione obbligatoria."
            : "";
        farmacoScelto =
          "<b>Paracetamolo</b> 1g fino a 3 volte al giorno continuativo + Ottimizzazione di infiltrazioni terapeutiche locali." +
          alternativaFansFlusso;
        motivazioneClinica =
          "Oppioidi maiores bloccati per severa compromissione restrittiva parenchimale polmonare.";
        noteCautela +=
          " ⚠️  <span style='color: var(--danger); font-weight: bold;'>ALERT DI SICUREZZA: Oppioidi maggiori rimossi dall'algoritmo per riscontro di Fibrosi Polmonare.</span>";
      }
    } else {
      farmacoScelto = `<b>Paracetamolo</b> 1g fino a 3 volte al giorno in somministrazione continuativa${fansCicli}.<br> 🏃‍♂️ Consigliata associata: <b>Riabilitazione motoria</b> mirata ed esercizio terapeutico graduale.`;
      motivazioneClinica =
        "Gestione a lungo termine focalizzata sul massimo profilo di sicurezza gastrointestinale ed emodinamica.";
    }
  }

  if (totAnsia >= 12 || totDepr >= 13) {
    noteCautela +=
      "<br> 🧠  <span style='color: var(--warning);'>DISTRESS EMOTIVO RILEVATO:</span> <i>Gli score dei questionari Zung indicano una significativa componente ansioso-depressiva associata. Integrare supporto psicologico cognitivo-comportamentale.</i>";
  }

  // AGGIORNAMENTO DELLA SEZIONE DI OUTPUT CON GENERAZIONE FLUIDA E STILI INLINE REALI PER I COLORI
  output.innerHTML = `
    <div style="border-left: 4px solid var(--accent); padding-left: 15px; margin-bottom: 15px;">
      <h4 style="color: var(--accent); margin: 0 0 5px 0;"> 📋  INQUADRAMENTO DIAGNOSTICO AUTOMATICO</h4>
      Punteggio DN4: <b>${totDN4}/10</b> | CSI Stimato: <b>${totCSI}/12</b> | Aree Corporee Mappate: <b>${numAree}</b><br>
      Inquadramento Dolore Misto: <b>${diagnosiMisto}</b><br>
      Picco intensità dolore (VAS Max): <span style="color: var(--danger); font-weight:bold;">${vasMax}/10</span>
    </div>
    <div style="background: #1e293b; padding: 15px; border-radius: 6px; border: 1px solid var(--purple); margin-top: 15px;">
      <h4 style="color: var(--purple); margin: 0 0 5px 0;"> ⚡  ALGORITMO DI SCELTA TERAPEUTICA AUTOMATICA</h4>
      <small style="color: #38bdf8; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Meccanismo prevalente: ${categoriaFarmaco}</small>
      <p style="font-size: 1.15rem; margin: 8px 0 10px 0; color: #fff; line-height: 1.5;">${farmacoScelto}</p>
      <hr style="border-color: #334155; margin: 10px 0;">
      <small style="color: var(--text-muted); display: block;"><b>Razionale d'Indirizzo Clinico:</b> ${motivazioneClinica}</small>
      ${
        noteCautela
          ? `<p style="margin: 10px 0 0 0; font-size: 0.95rem; background: rgba(245, 158, 11, 0.1); color: #ffedd5; padding: 10px; border-radius: 4px; border-left: 4px solid var(--warning); line-height:1.4;">${noteCautela}</p>`
          : ""
      }
    </div>
    <div style="margin-top: 15px; font-size: 0.85rem; color: #94a3b8;">
      ⚠️  <i>Nota di validazione: Lo schema terapeutico sopraindicato è calcolato in modalità autonoma dal CDSS combinando le scale diagnostiche compilate e le linee guida di tollerabilità d'organo.
      Richiede la firma e la convalida del medico prescrittore.</i>
    </div>`;
}

// ===========================================================================
// 2. FUNZIONI DI SUPPORTO AL DIAGNOSTICO E DI UTILITY CLINICA
// ===========================================================================

function haAntidepressivoAttivo() {
  const box = document.getElementById("farmaci-box");
  const boxScelti = document.getElementById("box-farmaci-scelti");

  // Raccoglie tutti i badge sia dal vecchio contenitore che dal nuovo box-farmaci-scelti
  let badges = [];
  if (box)
    badges = badges.concat(Array.from(box.querySelectorAll(".badge-clinico")));
  if (boxScelti)
    badges = badges.concat(
      Array.from(boxScelti.querySelectorAll(".badge-clinico"))
    );

  // Controlla anche l'array interno di sicurezza strutturato
  if (
    farmaciSelezionati.some((f) =>
      [
        "fluoxetina",
        "sertralina",
        "citalopram",
        "escitalopram",
        "paroxetina",
        "fluvoxamina",
        "duloxetina",
        "venlafaxina",
        "desvenlafaxina",
        "milnacipran",
        "levomilnacipran"
      ].includes(f)
    )
  ) {
    return true;
  }

  const elencoAntidepressivi = [
    "fluoxetina",
    "sertralina",
    "citalopram",
    "escitalopram",
    "paroxetina",
    "fluvoxamina",
    "duloxetina",
    "venlafaxina",
    "desvenlafaxina",
    "milnacipran",
    "levomilnacipran"
  ];

  for (let badge of badges) {
    const attr = badge.getAttribute("data-val");
    if (attr) {
      const farmacoInUso = attr.trim().toLowerCase();
      if (
        elencoAntidepressivi.some((antidepressivo) =>
          farmacoInUso.includes(antidepressivo)
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

// Nuova funzione per intercettare esplicitamente SSRI o SNRI
function haSSRIoSNRIAttivo() {
  const farmaciTarget = [
    "fluoxetina",
    "sertralina",
    "citalopram",
    "escitalopram",
    "paroxetina",
    "fluvoxamina",
    "duloxetina",
    "venlafaxina",
    "desvenlafaxina",
    "milnacipran",
    "levomilnacipran",
    "ssri",
    "snri"
  ];

  if (farmaciSelezionati.some((f) => farmaciTarget.includes(f))) return true;

  const boxScelti = document.getElementById("box-farmaci-scelti");
  if (boxScelti) {
    const badges = boxScelti.querySelectorAll(".badge-clinico");
    for (let badge of badges) {
      const val = (badge.getAttribute("data-val") || "").toLowerCase();
      if (farmaciTarget.some((t) => val.includes(t))) return true;
    }
  }
  return false;
}

// Nuova funzione per intercettare esplicitamente il Tramadolo inserito
function haTramadoloAttivo() {
  if (farmaciSelezionati.some((f) => f.includes("tramadolo"))) return true;

  const boxScelti = document.getElementById("box-farmaci-scelti");
  if (boxScelti) {
    const badges = boxScelti.querySelectorAll(".badge-clinico");
    for (let badge of badges) {
      const val = (badge.getAttribute("data-val") || "").toLowerCase();
      if (val.includes("tramadolo")) return true;
    }
  }
  return false;
}

function haComorbilitadiNome(nomeTarget) {
  const box = document.getElementById("comorbilita-box");
  if (!box) return false;
  const badges = box.querySelectorAll(".badge-clinico");
  for (let badge of badges) {
    const attr = badge.getAttribute("data-val");
    if (attr && attr.trim().toLowerCase() === nomeTarget.trim().toLowerCase()) {
      return true;
    }
  }
  return false;
}

function gestisciMappaDolore(idArea, checkbox) {
  if (checkbox.checked) {
    const contenitoreParametri = document.getElementById(`params-${idArea}`);
    let vasIniziale = 5;
    let meccIniziale = 0;
    let infIniziale = 0;
    let cronicoIniziale = false;

    if (contenitoreParametri) {
      vasIniziale =
        parseInt(contenitoreParametri.querySelector(".vas-select")?.value) || 5;
      meccIniziale =
        parseInt(contenitoreParametri.querySelector(".mecc-select")?.value) ||
        0;
      infIniziale =
        parseInt(contenitoreParametri.querySelector(".inf-select")?.value) || 0;
      cronicoIniziale =
        contenitoreParametri.querySelector(".cronico-check")?.checked || false;
    }

    mappaDoloreDati[idArea] = {
      vas: vasIniziale,
      meccanico: meccIniziale,
      infiammatorio: infIniziale,
      cronico: cronicoIniziale
    };
  } else {
    delete mappaDoloreDati[idArea];
  }
  eseguiCalcoloReportCDSS();
}

function aggiornaStatoStrumentiQuestionario(chiaveOggetto, idDomanda, valore) {
  if (chiaveOggetto === "DN4") {
    scoreDN4Dati[idDomanda] = valore;
  } else if (chiaveOggetto === "CSI") {
    scoreCSIDati[idDomanda] = valore;
  } else if (chiaveOggetto === "ZUNG_ANSIA") {
    scoreZungAnsiaDati[idDomanda] = valore;
  } else if (chiaveOggetto === "ZUNG_DEPR") {
    scoreZungDepxDati[idDomanda] = valore;
  }
  eseguiCalcoloReportCDSS();
}

// ===========================================================================
// 3. FUNZIONE UNIVERSALE DI GESTIONE DEI BADGE CLINICI CORRETTA ED ALLINEATA
// ===========================================================================
function aggiungiBadgeClinico(selectId, boxId) {
  const selectEl = document.getElementById(selectId);
  const box = document.getElementById(boxId);

  if (!selectEl || !box || !selectEl.value) return;

  const valoreSelezionato = selectEl.value;
  const valoreNormalizzato = valoreSelezionato.trim().toLowerCase();

  // Controllo dei duplicati grafici e di array
  const badgeEsistenti = box.querySelectorAll(".badge-clinico");
  for (let badge of badgeEsistenti) {
    if (badge.getAttribute("data-val") === valoreSelezionato) {
      selectEl.value = "";
      return;
    }
  }

  // Push nell'array di controllo di sicurezza se si tratta del box farmaci
  if (
    boxId === "box-farmaci-scelti" &&
    !farmaciSelezionati.includes(valoreNormalizzato)
  ) {
    farmaciSelezionati.push(valoreNormalizzato);
  }

  const idBadge =
    "badge-" + selectId + "-" + valoreSelezionato.replace(/\s+/g, "-");

  const badge = document.createElement("div");
  badge.className = "badge-clinico";
  badge.id = idBadge;
  badge.setAttribute("data-val", valoreSelezionato);

  // RISOLTO IL BUG DEL RICALCOLO ALLA RIMOZIONE (Rimosso valutaMotoreCDSS in favore di eseguiCalcoloReportCDSS)
  badge.innerHTML = `${valoreSelezionato} <span style="cursor:pointer; font-weight:bold; margin-left:5px;" onclick="rimuoviBadgeGlobale('${idBadge}', '${valoreNormalizzato}', '${boxId}');">×</span>`;

  box.appendChild(badge);
  selectEl.value = "";

  eseguiCalcoloReportCDSS();
}

// Sottofunzione di pulizia sicura degli array per mantenere allineati DOM e Logica Interna
function rimuoviBadgeGlobale(idBadge, valoreNormalizzato, boxId) {
  const el = document.getElementById(idBadge);
  if (el) el.remove();

  if (boxId === "box-farmaci-scelti") {
    farmaciSelezionati = farmaciSelezionati.filter(
      (f) => f !== valoreNormalizzato
    );
  }

  eseguiCalcoloReportCDSS();
}
