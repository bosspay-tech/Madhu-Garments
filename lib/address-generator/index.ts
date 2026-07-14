import locationsData from "./india-locations.json";

export type City = {
  name: string;
  pincode: string;
};

export type District = {
  name: string;
  cities: City[];
};

export type State = {
  name: string;
  code: string;
  districts: District[];
};

export type IndianAddress = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  houseNumber: string;
  street: string;
  landmark: string;
  area: string;
  city: string;
  district: string;
  state: string;
  stateCode: string;
  pincode: string;
  fullAddress: string;
};

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Shaurya", "Atharv", "Rohan", "Kabir", "Yash", "Harsh", "Rahul", "Amit", "Suresh", "Vikram",
  "Ananya", "Aadhya", "Diya", "Myra", "Sara", "Anika", "Pari", "Aisha", "Kiara", "Prisha",
  "Isha", "Riya", "Neha", "Pooja", "Sneha", "Kavya", "Meera", "Priya", "Shreya", "Tanvi"
] as const;

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Singh", "Kumar", "Gupta", "Joshi",
  "Mehta", "Shah", "Chopra", "Malhotra", "Kapoor", "Banerjee", "Mukherjee", "Das", "Chatterjee",
  "Pillai", "Rao", "Naidu", "Deshmukh", "Kulkarni", "Jadhav", "Patil", "Bose", "Agarwal",
  "Bansal", "Saxena"
] as const;

const EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "icloud.com"
] as const;

const STREET_TYPES = [
  "Main Road", "Cross", "Lane", "Street", "Marg", "Road", "Link Road", "Bye Pass"
] as const;

const STREET_NAMES = [
  "Gandhi", "Nehru", "Shivaji", "Subhash Chandra Bose", "Tagore", "Sardar Patel", "Ashoka",
  "Tilak", "Station", "Temple", "Market", "Park", "Lake View", "College", "Hospital",
  "Railway", "MG", "Ring"
] as const;

const LANDMARKS = [
  "Near City Hospital", "Opp. State Bank of India", "Beside Bus Stand", "Near Railway Station",
  "Behind City Centre Mall", "Near Post Office", "Opp. Police Station", "Near Hanuman Mandir",
  "Next to Municipal Park", "Near Metro Gate No. 2", "Close to Petrol Pump", "Adjacent to School"
] as const;

const AREA_SUFFIXES = [
  "Nagar", "Colony", "Extension", "Layout", "Enclave", "Vihar", "Society", "Phase", "Sector"
] as const;

const BUILDING_NAMES = [
  "Shree Apartments", "Green Valley Residency", "Sai Krupa Complex", "Sunrise Towers",
  "Lakshmi Nilayam", "Royal Heights", "Om Sai Plaza", "Ganga Bhawan", "Silver Oak Homes",
  "Krishna Kunj"
] as const;

const FLAT_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function chance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "");
}

export type Person = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
};

export function generatePerson(): Person {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const f = slug(firstName);
  const l = slug(lastName);
  const domain = pick(EMAIL_DOMAINS);
  const n = randomInt(1, 99);

  const local = pick([
    `${f}.${l}`,
    `${f}${l}`,
    `${f}_${l}`,
    `${f}.${l}${n}`,
    `${f}${n}.${l}`,
    `${l}.${f}`,
    `${f[0]}${l}${n}`,
  ]);

  return {
    firstName,
    lastName,
    fullName,
    email: `${local}@${domain}`,
  };
}

type AddressParts = {
  houseNumber: string;
  street: string;
  landmark: string;
  area: string;
};

function makeHouseNumber(): string {
  const n = randomInt(1, 240);
  const styles = [
    () => String(n),
    () => `${n}/${pick(FLAT_LETTERS)}`,
    () => `${n}-${pick(FLAT_LETTERS)}`,
    () => `${randomInt(1, 12)}/${n}`,
    () => `${pick(FLAT_LETTERS)}-${randomInt(100, 999)}`,
  ];
  return pick(styles)();
}

function makeStreet(): string {
  const name = pick(STREET_NAMES);
  const type = pick(STREET_TYPES);
  const styles = [
    () => `${name} ${type}`,
    () => `${name} ${type} No. ${randomInt(1, 12)}`,
    () => `${ordinal(randomInt(1, 9))} Cross, ${name} ${type}`,
  ];
  return pick(styles)();
}

function makeArea(cityName: string): string {
  const suffix = pick(AREA_SUFFIXES);
  if (suffix === "Sector" || suffix === "Phase") {
    return `${suffix} ${randomInt(1, 45)}, ${cityName}`;
  }
  const styles = [
    () => `${cityName} ${suffix}`,
    () => `${pick(STREET_NAMES)} ${suffix}`,
    () => `${pick(["New", "Old", "East", "West", "North", "South"])} ${cityName}`,
  ];
  return pick(styles)();
}

function makeParts(cityName: string): AddressParts {
  return {
    houseNumber: makeHouseNumber(),
    street: makeStreet(),
    landmark: pick(LANDMARKS),
    area: makeArea(cityName),
  };
}

function formatAddress(
  parts: AddressParts,
  city: string,
  district: string,
  state: string,
  pincode: string,
): string {
  const { houseNumber, street, landmark, area } = parts;
  const building = pick(BUILDING_NAMES);
  const floor = randomInt(1, 12);
  const flat = `${pick(FLAT_LETTERS)}-${randomInt(101, 1204)}`;
  const plot = `Plot No. ${randomInt(1, 250)}`;
  const block = `Block ${pick(FLAT_LETTERS)}`;
  const place = city.trim().toLowerCase() === district.trim().toLowerCase() ? city : `${city}, ${district}`;
  const tail = `${place}, ${state} - ${pincode}`;

  const formats: Array<() => string> = [
    () => [`H.No. ${houseNumber}, ${street}`, area, tail].join(", "),
    () => [`Flat ${flat}, ${ordinal(floor)} Floor, ${building}`, street, area, tail].join(", "),
    () => [`${plot}, ${street}`, landmark, area, tail].join(", "),
    () => [`Door No. ${houseNumber}`, street, area, city, `${state} ${pincode}`].join(", "),
    () => [`#${houseNumber}, ${street}`, landmark, `${area}, ${city}`, `${state} - ${pincode}`].join(", "),
    () => [`${flat}, ${building}`, `${block}, ${area}`, landmark, tail].join(", "),
    () => [`House No. ${houseNumber}`, `Village / Mohalla: ${area}`, `PO: ${city}`, `${state} - ${pincode}`].join(", "),
  ];

  return pick(formats)();
}

export function generateIndianAddress(seed?: string): IndianAddress {
  const states = (locationsData as any).states as State[];
  if (!states || !states.length) {
    throw new Error("No location states found in JSON");
  }

  // A simple seeded random function if seed is provided
  let rand = Math.random;
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    rand = () => {
      h = Math.imul(h ^ 123459876, 54321);
      return (Math.abs(h) % 1000000) / 1000000;
    };
  }

  const pickSeeded = <T>(items: readonly T[]): T => {
    return items[Math.floor(rand() * items.length)]!;
  };

  const chanceSeeded = (percent: number): boolean => {
    return rand() * 100 < percent;
  };

  const randomIntSeeded = (min: number, max: number): number => {
    return Math.floor(rand() * (max - min + 1)) + min;
  };

  const makeHouseNumber = (): string => {
    const n = randomIntSeeded(1, 240);
    const styles = [
      () => String(n),
      () => `${n}/${pickSeeded(FLAT_LETTERS)}`,
      () => `${n}-${pickSeeded(FLAT_LETTERS)}`,
      () => `${randomIntSeeded(1, 12)}/${n}`,
      () => `${pickSeeded(FLAT_LETTERS)}-${randomIntSeeded(100, 999)}`,
    ];
    return pickSeeded(styles)();
  };

  const makeStreet = (): string => {
    const name = pickSeeded(STREET_NAMES);
    const type = pickSeeded(STREET_TYPES);
    const styles = [
      () => `${name} ${type}`,
      () => `${name} ${type} No. ${randomIntSeeded(1, 12)}`,
      () => `${ordinal(randomIntSeeded(1, 9))} Cross, ${name} ${type}`,
    ];
    return pickSeeded(styles)();
  };

  const makeArea = (cityName: string): string => {
    const suffix = pickSeeded(AREA_SUFFIXES);
    if (suffix === "Sector" || suffix === "Phase") {
      return `${suffix} ${randomIntSeeded(1, 45)}, ${cityName}`;
    }
    const styles = [
      () => `${cityName} ${suffix}`,
      () => `${pickSeeded(STREET_NAMES)} ${suffix}`,
      () => `${pickSeeded(["New", "Old", "East", "West", "North", "South"])} ${cityName}`,
    ];
    return pickSeeded(styles)();
  };

  const makeParts = (cityName: string): AddressParts => {
    return {
      houseNumber: makeHouseNumber(),
      street: makeStreet(),
      landmark: pickSeeded(LANDMARKS),
      area: makeArea(cityName),
    };
  };

  const formatAddressSeeded = (
    parts: AddressParts,
    city: string,
    district: string,
    state: string,
    pincode: string,
  ): string => {
    const { houseNumber, street, landmark, area } = parts;
    const building = pickSeeded(BUILDING_NAMES);
    const floor = randomIntSeeded(1, 12);
    const flat = `${pickSeeded(FLAT_LETTERS)}-${randomIntSeeded(101, 1204)}`;
    const plot = `Plot No. ${randomIntSeeded(1, 250)}`;
    const block = `Block ${pickSeeded(FLAT_LETTERS)}`;
    const place = city.trim().toLowerCase() === district.trim().toLowerCase() ? city : `${city}, ${district}`;
    const tail = `${place}, ${state} - ${pincode}`;

    const formats: Array<() => string> = [
      () => [`H.No. ${houseNumber}, ${street}`, area, tail].join(", "),
      () => [`Flat ${flat}, ${ordinal(floor)} Floor, ${building}`, street, area, tail].join(", "),
      () => [`${plot}, ${street}`, landmark, area, tail].join(", "),
      () => [`Door No. ${houseNumber}`, street, area, city, `${state} ${pincode}`].join(", "),
      () => [`#${houseNumber}, ${street}`, landmark, `${area}, ${city}`, `${state} - ${pincode}`].join(", "),
      () => [`${flat}, ${building}`, `${block}, ${area}`, landmark, tail].join(", "),
      () => [`House No. ${houseNumber}`, `Village / Mohalla: ${area}`, `PO: ${city}`, `${state} - ${pincode}`].join(", "),
    ];

    return pickSeeded(formats)();
  };

  const state = pickSeeded(states);
  const district = pickSeeded(state.districts);
  
  const withPin = district.cities.filter((c) => c.pincode && c.pincode !== "000000");
  const city = pickSeeded(withPin.length ? withPin : district.cities);
  
  // Person generator using seeded rand
  const firstName = pickSeeded(FIRST_NAMES);
  const lastName = pickSeeded(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const f = slug(firstName);
  const l = slug(lastName);
  const domain = pickSeeded(EMAIL_DOMAINS);
  const n = randomIntSeeded(1, 99);

  const local = pickSeeded([
    `${f}.${l}`,
    `${f}${l}`,
    `${f}_${l}`,
    `${f}.${l}${n}`,
    `${f}${n}.${l}`,
    `${l}.${f}`,
    `${f[0]}${l}${n}`,
  ]);
  const email = `${local}@${domain}`;

  const parts = makeParts(city.name);
  const pincode = city.pincode && /^\d{6}$/.test(city.pincode) ? city.pincode : "400001";
  
  const fullAddress = formatAddressSeeded(
    parts,
    city.name,
    district.name,
    state.name,
    pincode,
  );

  return {
    name: fullName,
    firstName,
    lastName,
    email,
    houseNumber: parts.houseNumber,
    street: parts.street,
    landmark: parts.landmark,
    area: parts.area,
    city: city.name,
    district: district.name,
    state: state.name,
    stateCode: state.code,
    pincode,
    fullAddress,
  };
}
