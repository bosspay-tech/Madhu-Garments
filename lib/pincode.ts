type PostOffice = {
  District?: string;
  State?: string;
  Block?: string;
};

type PincodeLookupResponse = {
  Status: string;
  PostOffice?: PostOffice[];
};

export async function lookupIndianPincode(
  pincode: string,
): Promise<{ city: string; state: string } | null> {
  const normalized = pincode.replace(/\D/g, "");
  if (normalized.length !== 6) {
    return null;
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PincodeLookupResponse[];
  const result = data[0];

  if (!result || result.Status !== "Success" || !result.PostOffice?.length) {
    return null;
  }

  const office = result.PostOffice[0];
  const city = office.District?.trim() || office.Block?.trim() || "";
  const state = office.State?.trim() || "";

  if (!city && !state) {
    return null;
  }

  return { city, state };
}
