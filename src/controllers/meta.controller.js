const CAR_MODELS_BY_MAKE = {
  Audi: [
    'A1','A3','A4','A5','A6','A7','A8',
    'Q2','Q3','Q4 e-tron','Q5','Q7','Q8',
    'TT','R8','RS3','RS4','RS5','RS6','RS7',
    'S3','S4','S5','S6','S7','S8'
  ],

  BMW: [
    '1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','8 Series',
    'X1','X2','X3','X4','X5','X6','X7',
    'i3','i4','i7','iX','iX3',
    'M2','M3','M4','M5','M8'
  ],

  'Mercedes-Benz': [
    'A-Class','B-Class','C-Class','E-Class','S-Class',
    'CLA','CLS','GLA','GLB','GLC','GLE','GLS','G-Class',
    'EQC','EQA','EQB','EQS'
  ],

  Volkswagen: [
    'Up','Polo','Golf','Jetta','Passat','Arteon',
    'T-Cross','T-Roc','Tiguan','Touareg',
    'ID.3','ID.4','ID.5','ID.7'
  ],

  Toyota: [
    'Yaris','Corolla','Camry','Avensis',
    'C-HR','RAV4','Highlander','Land Cruiser',
    'Hilux','Prius','Supra','GR Yaris'
  ],

  Ford: [
    'Fiesta','Focus','Mondeo','Fusion',
    'Puma','Kuga','Explorer','Ranger',
    'Mustang','Mach-E'
  ],

  Honda: [
    'Civic','Accord','CR-V','HR-V','Jazz','Pilot'
  ],

  Hyundai: [
    'i10','i20','i30','Elantra','Sonata',
    'Kona','Tucson','Santa Fe','Palisade','IONIQ 5','IONIQ 6'
  ],

  Kia: [
    'Picanto','Rio','Ceed','Optima','Stinger',
    'Sportage','Sorento','Telluride','EV6'
  ],

  Dacia: [
    'Logan','Sandero','Duster','Jogger','Spring','Lodgy'
  ],

  Skoda: [
    'Fabia','Scala','Octavia','Superb',
    'Kamiq','Karoq','Kodiaq','Enyaq'
  ],

  Renault: [
    'Clio','Megane','Talisman',
    'Captur','Kadjar','Arkana','Austral','Espace'
  ],

  Peugeot: [
    '108','208','308','408',
    '2008','3008','5008'
  ],

  Opel: [
    'Corsa','Astra','Insignia',
    'Mokka','Grandland','Zafira'
  ],

  Nissan: [
    'Micra','Juke','Qashqai','X-Trail','Navara','Leaf'
  ],

  Mazda: [
    'Mazda2','Mazda3','Mazda6',
    'CX-3','CX-30','CX-5','CX-60','CX-9','MX-5'
  ]
};

export const getMetaHealth = (req, res) => {
  res.status(200).json({ success: true });
};

export const getCarMakes = (req, res) => {
  const items = Object.keys(CAR_MODELS_BY_MAKE);
  res.status(200).json({ success: true, data: { items } });
};

export const getCarModels = (req, res) => {
  const makeRaw = (req.query.make ?? '').toString().trim();
  if (!makeRaw) {
    return res.status(400).json({
      success: false,
      code: 'MAKE_REQUIRED',
      message: 'make query param is required',
    });
  }
  const makeKey = Object.keys(CAR_MODELS_BY_MAKE).find(
    (m) => m.toLowerCase() === makeRaw.toLowerCase()
  );
  if (!makeKey) {
    return res.status(404).json({
      success: false,
      code: 'MAKE_NOT_FOUND',
      message: 'Unknown make',
    });
  }
  const items = [...(CAR_MODELS_BY_MAKE[makeKey] || [])];
  res.status(200).json({ success: true, data: { items } });
};
