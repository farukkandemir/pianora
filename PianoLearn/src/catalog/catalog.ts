/**
 * Built-in catalogue: public-domain pieces bundled with the app, shown on the
 * Browse tab. Files live in assets/catalog and come from the MuseTrainer
 * public-domain MusicXML library (github.com/musetrainer/library). Titles and
 * composers are set here because many of the files carry none. Bar counts are
 * what the parser reports, for display before the file is parsed.
 */
export type CatalogLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CatalogEntry {
  id: string;
  title: string;
  composer: string;
  level: CatalogLevel;
  bars: number;
  /** Metro asset module id (`require` of the .mxl). */
  asset: number;
}

export const LEVEL_LABEL: Record<CatalogLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const CATALOG: CatalogEntry[] = [
  // Beginner
  { id: 'ode-to-joy', title: 'Ode to Joy', composer: 'Ludwig van Beethoven', level: 'beginner', bars: 17, asset: require('../../assets/catalog/ode-to-joy.mxl') },
  { id: 'happy-birthday', title: 'Happy Birthday to You', composer: 'Traditional', level: 'beginner', bars: 8, asset: require('../../assets/catalog/happy-birthday.mxl') },
  { id: 'minuet-in-g', title: 'Minuet in G major', composer: 'Christian Petzold', level: 'beginner', bars: 32, asset: require('../../assets/catalog/minuet-in-g.mxl') },
  { id: 'fur-elise-easy', title: 'Für Elise (easy)', composer: 'Ludwig van Beethoven', level: 'beginner', bars: 24, asset: require('../../assets/catalog/fur-elise-easy.mxl') },
  { id: 'greensleeves', title: 'Greensleeves', composer: 'Traditional', level: 'beginner', bars: 33, asset: require('../../assets/catalog/greensleeves.mxl') },
  { id: 'canon-in-d-easy', title: 'Canon in D (easy)', composer: 'Johann Pachelbel', level: 'beginner', bars: 49, asset: require('../../assets/catalog/canon-in-d-easy.mxl') },
  { id: 'carol-of-the-bells-easy', title: 'Carol of the Bells (easy)', composer: 'Mykola Leontovych', level: 'beginner', bars: 40, asset: require('../../assets/catalog/carol-of-the-bells-easy.mxl') },
  // Intermediate
  { id: 'bach-prelude-c', title: 'Prelude in C major, BWV 846', composer: 'Johann Sebastian Bach', level: 'intermediate', bars: 34, asset: require('../../assets/catalog/bach-prelude-c.mxl') },
  { id: 'gymnopedie-1', title: 'Gymnopédie No. 1', composer: 'Erik Satie', level: 'intermediate', bars: 78, asset: require('../../assets/catalog/gymnopedie-1.mxl') },
  { id: 'fur-elise', title: 'Für Elise', composer: 'Ludwig van Beethoven', level: 'intermediate', bars: 106, asset: require('../../assets/catalog/fur-elise.mxl') },
  { id: 'chopin-prelude-e-minor', title: 'Prélude in E minor, Op. 28 No. 4', composer: 'Frédéric Chopin', level: 'intermediate', bars: 26, asset: require('../../assets/catalog/chopin-prelude-e-minor.mxl') },
  { id: 'moonlight-sonata-1', title: 'Moonlight Sonata, 1st movement', composer: 'Ludwig van Beethoven', level: 'intermediate', bars: 69, asset: require('../../assets/catalog/moonlight-sonata-1.mxl') },
  { id: 'chopin-nocturne-op9-2-easy', title: 'Nocturne Op. 9 No. 2 (easy)', composer: 'Frédéric Chopin', level: 'intermediate', bars: 65, asset: require('../../assets/catalog/chopin-nocturne-op9-2-easy.mxl') },
  { id: 'air-on-the-g-string', title: 'Air on the G String', composer: 'Johann Sebastian Bach', level: 'intermediate', bars: 37, asset: require('../../assets/catalog/air-on-the-g-string.mxl') },
  { id: 'swan-lake', title: 'Swan Lake, main theme', composer: 'Pyotr Ilyich Tchaikovsky', level: 'intermediate', bars: 32, asset: require('../../assets/catalog/swan-lake.mxl') },
  { id: 'bella-ciao', title: 'Bella Ciao', composer: 'Traditional', level: 'intermediate', bars: 38, asset: require('../../assets/catalog/bella-ciao.mxl') },
  { id: 'chopin-waltz-a-minor', title: 'Waltz in A minor, B. 150', composer: 'Frédéric Chopin', level: 'intermediate', bars: 57, asset: require('../../assets/catalog/chopin-waltz-a-minor.mxl') },
  { id: 'canon-in-d', title: 'Canon in D', composer: 'Johann Pachelbel', level: 'intermediate', bars: 102, asset: require('../../assets/catalog/canon-in-d.mxl') },
  { id: 'mozart-k545-1', title: 'Sonata in C major, K. 545, 1st movement', composer: 'Wolfgang Amadeus Mozart', level: 'intermediate', bars: 73, asset: require('../../assets/catalog/mozart-k545-1.mxl') },
  { id: 'pathetique-2', title: 'Pathétique Sonata, 2nd movement', composer: 'Ludwig van Beethoven', level: 'intermediate', bars: 73, asset: require('../../assets/catalog/pathetique-2.mxl') },
  // Advanced
  { id: 'clair-de-lune', title: 'Clair de Lune', composer: 'Claude Debussy', level: 'advanced', bars: 72, asset: require('../../assets/catalog/clair-de-lune.mxl') },
  { id: 'chopin-nocturne-op9-2', title: 'Nocturne Op. 9 No. 2', composer: 'Frédéric Chopin', level: 'advanced', bars: 38, asset: require('../../assets/catalog/chopin-nocturne-op9-2.mxl') },
  { id: 'rondo-alla-turca', title: 'Rondo alla Turca', composer: 'Wolfgang Amadeus Mozart', level: 'advanced', bars: 137, asset: require('../../assets/catalog/rondo-alla-turca.mxl') },
  { id: 'the-entertainer', title: 'The Entertainer', composer: 'Scott Joplin', level: 'advanced', bars: 92, asset: require('../../assets/catalog/the-entertainer.mxl') },
];
