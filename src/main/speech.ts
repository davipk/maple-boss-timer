/**
 * A class that manages speech synthesis for a given locale.
 */
export class SpeechManager {

    /**
     * The SpeechSynthesis instance used for speech synthesis.
     */
    private synth: SpeechSynthesis;

    /**
     * The SpeechSynthesisUtterance instance used for speech synthesis.
     */
    private utterance: SpeechSynthesisUtterance;

    /**
     * The locale used for speech synthesis.
     */
    private locale: string;

    /**
     * Creates a new SpeechManager instance.
     * @param synth The SpeechSynthesis instance used for speech synthesis.
     * @param locale The locale used for speech synthesis.
     * @throws An error if SpeechSynthesis is not supported.
     */
    constructor(synth: SpeechSynthesis, locale: string) {
        if (!synth) {
            throw new Error('SpeechSynthesis is not supported.');
        }
        this.synth = synth;
        this.locale = locale;
        this.utterance = new SpeechSynthesisUtterance();
        this.setDefaultVoice();
    }

    /**
     * Sets the default voice for the given locale.
     */
    private setDefaultVoice() {
        const voices = this.synth.getVoices();
        const voice = voices.find((v) => v.lang.includes(this.locale));
        if (voice) {
            this.utterance.voice = voice;
            this.utterance.lang = this.locale;
        }
    }

    /**
     * Sets the voice for speech synthesis.
     * @param voice The SpeechSynthesisVoice instance to use for speech synthesis.
     */
    public setVoice(voice: SpeechSynthesisVoice) {
        if (!this.synth.speaking) {
            this.synth.cancel();
        }
        this.utterance.voice = voice;
    }

    /**
     * Gets the available voices for speech synthesis.
     * @returns An array of SpeechSynthesisVoice instances.
     */
    public getVoices() {
        return this.synth.getVoices();
    }

    /**
     * Checks if the speech is muted.
     * @returns A boolean indicating whether the speech is muted.
     */
    public isMuted() {
        return this.utterance.volume === 0;
    }

    /**
     * Toggles the mute state of the speech.
     */
    public toggleMute() {
        if (this.isMuted()) {
            this.utterance.volume = 1;
        } else {
            this.utterance.volume = 0;
        }
    }

    /**
     * Speaks the given text using speech synthesis.
     * @param text The text to speak.
     * @param repeat Whether to repeat the speech if it is already speaking.
     */
    public speak(text: string, repeat = false) {
        if (this.utterance.text !== text || (repeat && !this.synth.speaking)) {
            this.synth.cancel();
            this.utterance.text = text;
            this.synth.speak(this.utterance);
        }
    }
}