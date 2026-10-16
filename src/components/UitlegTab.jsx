const cardStyle = {
  padding: 18,
  borderRadius: 18,
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const stepStyle = {
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(47,147,255,0.18)",
};

export default function UitlegTab() {
  return (
    <div className="card">
      <h2>Uitleg OSC Cup Manager</h2>

      <p style={{ color: "#9fb3c8" }}>
        Deze app helpt bij het beheren van de OPTSCH SNG Cup: spelers,
        beschikbaarheid, loting, uitslagen, plaatsing en exports.
      </p>

      <div style={{ display: "grid", gap: 18, marginTop: 22 }}>
        <div style={cardStyle}>
          <h3>1. Spelers</h3>
          <p>
            In de spelers-tab beheer je alle deelnemers van het seizoen. Hier
            voeg je spelers toe en koppel je beschikbaarheid/verhinderingen.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>2. Beschikbaarheid-template</h3>
          <p>
            In de exports-tab kun je een Excel-template downloaden. Vul per
            speler de naam in en markeer de data waarop iemand niet kan spelen.
            Leeg betekent beschikbaar.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>3. Loting</h3>
          <p>
            In de loting-tab genereer je per ronde automatisch de SNG’s op basis
            van beschikbare spelers en speeldata. Voor het locken kun je spelers
            nog handmatig ruilen, mits beide spelers akkoord zijn.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>4. Uitslagen</h3>
          <p>
            In de uitslagen-tab voer je per SNG de eindposities, busts en stack
            bij eliminatie in. Daarna kan de kwalificatie naar de volgende ronde
            berekend worden.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>5. SNG Beheer</h3>
          <p>
            In SNG Beheer kun je bestaande SNG’s aanpassen, spelers verwijderen,
            statussen wijzigen en notities toevoegen.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>6. Exports</h3>
          <p>
            In de exports-tab maak je afbeeldingen voor loting, uitslagen,
            geplaatste spelers en SNG-overzichten. Deze exports zijn bedoeld
            voor bijvoorbeeld WhatsApp of socials.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>7. Instellingen</h3>
          <p>
            In instellingen beheer je het actieve seizoen, de speeldata, nieuwe
            seizoenen en accountinstellingen zoals je wachtwoord.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>8. Logs</h3>
          <p>
            In de logs-tab zie je welke acties zijn uitgevoerd, wanneer dit is
            gebeurd en door welke admin.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Aanbevolen volgorde</h3>

          <div style={{ display: "grid", gap: 10 }}>
            {[
              "Controleer de instellingen en speeldata.",
              "Download de beschikbaarheid-template via Exports.",
              "Importeer of voeg spelers toe.",
              "Genereer de loting.",
              "Controleer en ruil spelers indien nodig.",
              "Lock de loting.",
              "Voer uitslagen in.",
              "Bereken kwalificatie.",
              "Maak exports voor communicatie.",
            ].map((step, index) => (
              <div key={step} style={stepStyle}>
                <strong style={{ color: "#ff9d42" }}>{index + 1}.</strong>{" "}
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}