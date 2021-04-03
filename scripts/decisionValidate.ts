import { QVote } from "../types";

export function areOptionsValid(d: QVote.Decision) {
  const areUnique = areOptionsUnique(d.options);
  return d.options.length > 1 && areUnique;
}

export function areOptionsUnique(d: QVote.Option[]) {
  const res: { [key: string]: QVote.Option } = {};
  d.forEach((o) => {
    res[o.optName] = o;
  });
  const optionsSize = d.length;
  const areUnique = Object.entries(res).length == optionsSize;
  return areUnique;
}

export function decisionValidate(
  d: QVote.Decision
): {
  nameValid: boolean;
  descriptionValid: boolean;
  optionsValid: boolean;
  registerEndTimeValid: boolean;
  endTimeValid: boolean;
  creditToTokenRatioValid: boolean;
  tokenIdValid: boolean;
  isValid: boolean;
} {
  const res = {
    nameValid: d.name.length > 0,
    descriptionValid: d.description.length > 0,
    optionsValid: areOptionsValid(d),
    registerEndTimeValid: d.registerEndTime >= 0,
    endTimeValid: d.endTime > 0,
    creditToTokenRatioValid: true,
    tokenIdValid: d.tokenId.length > 0,
  };
  const isValid = Object.entries(res).reduce((prev, cur) => {
    if (cur[1] == false) {
      return false;
    } else {
      return prev;
    }
  }, true);
  return { ...res, isValid };
}

export function addMinutes(passToConstructor: any, m: number) {
  const res = new Date(passToConstructor);
  res.setTime(res.getTime() + m * 60 * 1000); // NOTE what's this number?
  return res;
}

export function getInitDecision(): QVote.Decision {
  return {
    name: "",
    description: "",
    options: [],
    registerEndTime: 5,
    endTime: 60,
    tokenId: "GZIL",
    creditToTokenRatio: "1",
  };
}