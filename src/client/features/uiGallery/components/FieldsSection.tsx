import { useState } from "react";

import { Stepper } from "../../../components/ui/Stepper";
import { TextField } from "../../../components/ui/TextField";
import { GallerySection } from "./GallerySection";

const PSEUDO_MAX_LENGTH = 16;
const ROUND_STEP_S = 15;
const ROUND_MIN_S = 30;
const ROUND_MAX_S = 120;

export function FieldsSection() {
  const [pseudo, setPseudo] = useState("Mika");
  const [roundSeconds, setRoundSeconds] = useState(60);

  return (
    <GallerySection
      title="Champs et réglages"
      note="Le champ garde sa taille dans tous ses états ; l’anneau de focus est une ombre extérieure."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <TextField
          label="Ton pseudo"
          value={pseudo}
          onChange={setPseudo}
          maxLength={PSEUDO_MAX_LENGTH}
          hint="2 à 16 caractères. Tu choisiras ta couleur dans le lobby."
        />
        <TextField label="Sans compteur" value="Nova" onChange={() => {}} />
        <TextField
          label="En erreur"
          value="Lulu"
          onChange={() => {}}
          maxLength={PSEUDO_MAX_LENGTH}
          error="Ce pseudo est déjà pris dans la room. Ajoute un chiffre, ou change complètement."
        />
        <TextField label="Désactivé" value="Biscuit" onChange={() => {}} disabled />
      </div>

      <div className="flex max-w-lg flex-col gap-2">
        <Stepper
          label="Durée d’une manche"
          value={`${roundSeconds} s`}
          editable
          canDecrement={roundSeconds > ROUND_MIN_S}
          canIncrement={roundSeconds < ROUND_MAX_S}
          onDecrement={() => setRoundSeconds(roundSeconds - ROUND_STEP_S)}
          onIncrement={() => setRoundSeconds(roundSeconds + ROUND_STEP_S)}
        />
        <Stepper
          label="Borne basse atteinte"
          value={`${ROUND_MIN_S} s`}
          editable
          canDecrement={false}
        />
        <Stepper label="Vue joueur" value="3 s" editable={false} />
        <Stepper label="Vue joueur · illumination" value="3 s" editable={false} highlighted />
      </div>
    </GallerySection>
  );
}
