export interface License {
  id: string;
  name: string;
  url: string;
}

export const LICENSES: License[] = [
  { id: "cc-zero", name: "Creative Commons Zero (CC0)", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { id: "cc-by", name: "Creative Commons Attribution (CC-BY)", url: "https://creativecommons.org/licenses/by/4.0/" },
  { id: "cc-by-sa", name: "Creative Commons Attribution ShareAlike (CC-BY-SA)", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { id: "odc-by", name: "Open Data Commons Attribution (ODC-By)", url: "https://opendatacommons.org/licenses/by/1-0/" },
  { id: "odc-odbl", name: "Open Data Commons Open Database (ODbL)", url: "https://opendatacommons.org/licenses/odbl/1-0/" },
  { id: "us-pd", name: "U.S. Public Domain", url: "https://creativecommons.org/publicdomain/mark/1.0/" },
  { id: "other", name: "Other", url: "" },
];

export function getLicenseByUrl(url: string): License | undefined {
  return LICENSES.find((l) => l.url === url);
}

export function getLicenseById(id: string): License | undefined {
  return LICENSES.find((l) => l.id === id);
}
