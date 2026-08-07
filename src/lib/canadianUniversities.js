// Comprehensive list of Canadian universities with their public course
// catalog / academic calendar URL. Used by UniversitySelector for the
// searchable dropdown and by the course-code AI autofill prompt.
//
// Each entry: { name, domain, catalogUrl, province }
export const CANADIAN_UNIVERSITIES = [
  { name: "University of Toronto", domain: "utoronto.ca", catalogUrl: "https://www.artsci.utoronto.ca/fascs/coursedesc", province: "ON" },
  { name: "University of Waterloo", domain: "uwaterloo.ca", catalogUrl: "https://uwaterloo.ca/academic-calendar/courses", province: "ON" },
  { name: "McMaster University", domain: "mcmaster.ca", catalogUrl: "https://academiccalendars.romcmaster.ca", province: "ON" },
  { name: "Western University", domain: "uwo.ca", catalogUrl: "https://www.westerncalendar.uwo.ca", province: "ON" },
  { name: "York University", domain: "yorku.ca", catalogUrl: "https://calendars.students.yorku.ca", province: "ON" },
  { name: "Toronto Metropolitan University", domain: "torontomu.ca", catalogUrl: "https://www.torontomu.ca/calendar", province: "ON" },
  { name: "University of Ottawa", domain: "uottawa.ca", catalogUrl: "https://catalogue.uottawa.ca", province: "ON" },
  { name: "Carleton University", domain: "carleton.ca", catalogUrl: "https://calendar.carleton.ca", province: "ON" },
  { name: "Queen's University", domain: "queensu.ca", catalogUrl: "https://catalog.queensu.ca", province: "ON" },
  { name: "University of British Columbia", domain: "ubc.ca", catalogUrl: "https://www.calendar.ubc.ca/vancouver", province: "BC" },
  { name: "McGill University", domain: "mcgill.ca", catalogUrl: "https://www.mcgill.ca/study/courses", province: "QC" },
  { name: "Concordia University", domain: "concordia.ca", catalogUrl: "https://www.concordia.ca/academics/undergraduate/calendar", province: "QC" },
  { name: "Université de Montréal", domain: "umontreal.ca", catalogUrl: "https://etudier.umontreal.ca", province: "QC" },
  { name: "Université Laval", domain: "ulaval.ca", catalogUrl: "https://www5.ulaval.ca/repertoire2", province: "QC" },
  { name: "University of Alberta", domain: "ualberta.ca", catalogUrl: "https://calendar.ualberta.ca", province: "AB" },
  { name: "University of Calgary", domain: "ucalgary.ca", catalogUrl: "https://www.ucalgary.ca/pubs/calendar", province: "AB" },
  { name: "University of Manitoba", domain: "umanitoba.ca", catalogUrl: "https://catalog.umanitoba.ca", province: "MB" },
  { name: "University of Saskatchewan", domain: "usask.ca", catalogUrl: "https://catalog.usask.ca", province: "SK" },
  { name: "Dalhousie University", domain: "dal.ca", catalogUrl: "https://www.dal.ca/academics/calendar.html", province: "NS" },
  { name: "Simon Fraser University", domain: "sfu.ca", catalogUrl: "https://www.sfu.ca/students/calendar.html", province: "BC" },
  { name: "University of Victoria", domain: "uvic.ca", catalogUrl: "https://www.uvic.ca/calendar", province: "BC" },
  { name: "Brock University", domain: "brocku.ca", catalogUrl: "https://brocku.ca/webcal", province: "ON" },
  { name: "University of Guelph", domain: "uoguelph.ca", catalogUrl: "https://www.uoguelph.ca/programs", province: "ON" },
  { name: "Wilfrid Laurier University", domain: "wlu.ca", catalogUrl: "https://students.wlu.ca/programs", province: "ON" },
  { name: "Trent University", domain: "trentu.ca", catalogUrl: "https://www.trentu.ca/academic-calendar", province: "ON" },
  { name: "Lakehead University", domain: "lakeheadu.ca", catalogUrl: "https://www.lakeheadu.ca/programs", province: "ON" },
  { name: "Laurentian University", domain: "laurentian.ca", catalogUrl: "https://laurentian.ca/programs", province: "ON" },
  { name: "Nipissing University", domain: "nipissingu.ca", catalogUrl: "https://www.nipissingu.ca/academic-calendar", province: "ON" },
  { name: "Ontario Tech University", domain: "ontariotechu.ca", catalogUrl: "https://calendar.ontariotechu.ca", province: "ON" },
  { name: "University of Windsor", domain: "uwindsor.ca", catalogUrl: "https://www.uwindsor.ca/calendar", province: "ON" },
  { name: "Algoma University", domain: "algomau.ca", catalogUrl: "https://algomau.ca/academic-calendar", province: "ON" },
  { name: "Mount Allison University", domain: "mta.ca", catalogUrl: "https://www.mta.ca/academic-calendar", province: "NB" },
  { name: "St. Francis Xavier University", domain: "stfx.ca", catalogUrl: "https://www.stfx.ca/academic-calendar", province: "NS" },
  { name: "Acadia University", domain: "acadiau.ca", catalogUrl: "https://calendar.acadiau.ca", province: "NS" },
  { name: "University of New Brunswick", domain: "unb.ca", catalogUrl: "https://es.unb.ca/frontend/calendar", province: "NB" },
  { name: "Memorial University of Newfoundland", domain: "mun.ca", catalogUrl: "https://www.mun.ca/regoff/calendar", province: "NL" },
  { name: "Saint Mary's University", domain: "smu.ca", catalogUrl: "https://www.smu.ca/academics/academic-calendar.html", province: "NS" },
  { name: "Cape Breton University", domain: "cbu.ca", catalogUrl: "https://www.cbu.ca/academics/calendar", province: "NS" },
  { name: "Mount Saint Vincent University", domain: "msvu.ca", catalogUrl: "https://www.msvu.ca/academic-calendar", province: "NS" },
  { name: "University of Prince Edward Island", domain: "upei.ca", catalogUrl: "https://www.upei.ca/academic-calendar", province: "PE" },
  { name: "Thompson Rivers University", domain: "tru.ca", catalogUrl: "https://www.tru.ca/calendar.html", province: "BC" },
  { name: "University of Northern British Columbia", domain: "unbc.ca", catalogUrl: "https://www2.unbc.ca/calendar", province: "BC" },
  { name: "Royal Roads University", domain: "royalroads.ca", catalogUrl: "https://www.royalroads.ca/calendar", province: "BC" },
  { name: "Vancouver Island University", domain: "viu.ca", catalogUrl: "https://calendar.viu.ca", province: "BC" },
  { name: "Kwantlen Polytechnic University", domain: "kpu.ca", catalogUrl: "https://www.kpu.ca/calendar", province: "BC" },
  { name: "University of the Fraser Valley", domain: "ufv.ca", catalogUrl: "https://www.ufv.ca/calendar", province: "BC" },
  { name: "Emily Carr University of Art + Design", domain: "ecuad.ca", catalogUrl: "https://www.ecuad.ca/calendar", province: "BC" },
  { name: "University of Regina", domain: "uregina.ca", catalogUrl: "https://www.uregina.ca/academics/calendars", province: "SK" },
  { name: "Brandon University", domain: "brandonu.ca", catalogUrl: "https://www.brandonu.ca/calendar", province: "MB" },
  { name: "University of Lethbridge", domain: "uleth.ca", catalogUrl: "https://www.uleth.ca/calendar", province: "AB" },
  { name: "Athabasca University", domain: "athabascau.ca", catalogUrl: "https://www.athabascau.ca/programs", province: "AB" },
  { name: "MacEwan University", domain: "macewan.ca", catalogUrl: "https://www.macewan.ca/programs", province: "AB" },
  { name: "Mount Royal University", domain: "mtroyal.ca", catalogUrl: "https://www.mtroyal.ca/Calendar", province: "AB" },
  { name: "Bishop's University", domain: "ubishops.ca", catalogUrl: "https://www.ubishops.ca/academic-calendar", province: "QC" },
  { name: "Brescia University College", domain: "uwo.ca", catalogUrl: "https://www.westerncalendar.uwo.ca", province: "ON" },
  { name: "Huron University College", domain: "huronuc.ca", catalogUrl: "https://huronuc.ca/academics/calendar", province: "ON" },
  { name: "Redeemer University", domain: "redeemer.ca", catalogUrl: "https://www.redeemer.edu/academic-calendar", province: "ON" },
  { name: "Tyndale University", domain: "tyndale.ca", catalogUrl: "https://www.tyndale.ca/academic-calendar", province: "ON" },
  { name: "OCAD University", domain: "ocadu.ca", catalogUrl: "https://www.ocadu.ca/academics/calendar", province: "ON" },
  { name: "Emily Carr University", domain: "ecuad.ca", catalogUrl: "https://www.ecuad.ca/calendar", province: "BC" },
  { name: "Université de Sherbrooke", domain: "usherbrooke.ca", catalogUrl: "https://www.usherbrooke.ca/programmes", province: "QC" },
  { name: "Université du Québec à Montréal", domain: "uqam.ca", catalogUrl: "https://etudier.uqam.ca", province: "QC" },
  { name: "Université du Québec à Trois-Rivières", domain: "uqtr.ca", catalogUrl: "https://oraprdnt.uqtr.uquebec.ca", province: "QC" },
  { name: "Université du Québec à Chicoutimi", domain: "uqac.ca", catalogUrl: "https://www.uqac.ca/programmes", province: "QC" },
  { name: "Université du Québec à Rimouski", domain: "uqar.ca", catalogUrl: "https://www.uqar.ca/etudes", province: "QC" },
  { name: "Université du Québec en Outaouais", domain: "uqo.ca", catalogUrl: "https://uqo.ca/programmes", province: "QC" },
  { name: "Université du Québec à Abitibi-Témiscamingue", domain: "uqat.ca", catalogUrl: "https://www.uqat.ca/programmes", province: "QC" },
  { name: "École de technologie supérieure", domain: "etsmtl.ca", catalogUrl: "https://www.etsmtl.ca/etudes/cours", province: "QC" },
  { name: "HEC Montréal", domain: "hec.ca", catalogUrl: "https://www.hec.ca/programmes", province: "QC" },
  { name: "Polytechnique Montréal", domain: "polymtl.ca", catalogUrl: "https://www.polymtl.ca/programmes", province: "QC" },
  { name: "INRS", domain: "inrs.ca", catalogUrl: "https://www.inrs.ca/programmes", province: "QC" },
  { name: "Télé-université (TÉLUQ)", domain: "teluq.ca", catalogUrl: "https://www.teluq.ca/etudes", province: "QC" },
  { name: "Bishop's University", domain: "ubishops.ca", catalogUrl: "https://www.ubishops.ca/academic-calendar", province: "QC" },
  { name: "Royal Military College of Canada", domain: "rmc-cmr.ca", catalogUrl: "https://www.rmc-cmr.ca/academic-calendar", province: "ON" },
  { name: "University of King's College", domain: "kings.ca", catalogUrl: "https://ukings.ca/academic-calendar", province: "NS" },
  { name: "NSCAD University", domain: "nscad.ca", catalogUrl: "https://www.nscad.ca/academics/calendar", province: "NS" },
  { name: "St. Thomas University", domain: "stu.ca", catalogUrl: "https://www.stu.ca/academic-calendar", province: "NB" },
  { name: "University of Sudbury", domain: "usudbury.ca", catalogUrl: "https://usudbury.ca/academics", province: "ON" },
  { name: "Holland College", domain: "hollandcollege.com", catalogUrl: "https://hollandcollege.com/calendar", province: "PE" },
  { name: "University of Toronto Mississauga", domain: "utoronto.ca", catalogUrl: "https://www.utm.utoronto.ca/calendar", province: "ON" },
  { name: "University of Toronto Scarborough", domain: "utoronto.ca", catalogUrl: "https://www.utsc.utoronto.ca/registrar/calendar", province: "ON" },
  { name: "Lethbridge College", domain: "lethcollege.ca", catalogUrl: "https://lethcollege.ca/calendar", province: "AB" },
  { name: "Sheridan College", domain: "sheridancollege.ca", catalogUrl: "https://academics.sheridancollege.ca", province: "ON" },
  { name: "Humber College", domain: "humber.ca", catalogUrl: "https://humber.ca/academic-calendar", province: "ON" },
  { name: "Seneca Polytechnic", domain: "senecapolytechnic.ca", catalogUrl: "https://www.senecapolytechnic.ca/academics/calendar", province: "ON" },
  { name: "George Brown College", domain: "georgebrown.ca", catalogUrl: "https://www.georgebrown.ca/programs", province: "ON" },
  { name: "Algonquin College", domain: "algonquincollege.com", catalogUrl: "https://www.algonquincollege.com/programs", province: "ON" },
  { name: "Conestoga College", domain: "conestogac.on.ca", catalogUrl: "https://www.conestogac.on.ca/full-time", province: "ON" },
  { name: "Mohawk College", domain: "mohawkcollege.ca", catalogUrl: "https://www.mohawkcollege.ca/programs", province: "ON" },
  { name: "BCIT", domain: "bcit.ca", catalogUrl: "https://www.bcit.ca/programs", province: "BC" },
  { name: "NAIT", domain: "nait.ca", catalogUrl: "https://www.nait.ca/programs", province: "AB" },
  { name: "SAIT", domain: "sait.ca", catalogUrl: "https://www.sait.ca/programs-and-courses", province: "AB" },
  { name: "Fanshawe College", domain: "fanshawec.ca", catalogUrl: "https://www.fanshawec.ca/programs", province: "ON" },
  { name: "Durham College", domain: "durhamcollege.ca", catalogUrl: "https://www.durhamcollege.ca/programs", province: "ON" },
];

// Case-insensitive search over the list.
export function searchUniversities(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return CANADIAN_UNIVERSITIES.slice(0, 8);
  return CANADIAN_UNIVERSITIES.filter((u) => {
    const name = u.name.toLowerCase();
    const domain = (u.domain || "").toLowerCase();
    return name.includes(q) || domain.includes(q);
  });
}

export function findUniversityByName(name) {
  if (!name) return null;
  return CANADIAN_UNIVERSITIES.find((u) => u.name.toLowerCase() === name.toLowerCase()) || null;
}