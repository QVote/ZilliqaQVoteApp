import { Box, Text, Heading, Button, ResponsiveContext } from "grommet";
import React, { useContext, useEffect } from "react";
import { useState } from "react";
import { intPls } from "../../scripts";
import { createSlidersState } from "./utill";
import { PosWithMeters } from "./PosWithMeters";
import SliderModal from "./SliderModal";
import Meters from "./Meters";
import { onSliderConfirm } from "./utill";
import { QVote } from "../../types";
import { ScrollBox } from "../ScrollBox";
import { QParagraph } from "../QParagraph";
import { QHeading } from "../QHeading";
import { TwoCards } from "../TwoCards";
import { BlockchainApi } from "../../helpers/BlockchainApi";
import type { useMainContext } from "../../hooks/useMainContext";
import { TransactionSubmitted } from "../TransactionSubmitted";
import { useRouter } from "next/router";

const sliderInit = {
  max: 0,
  min: 0,
  cur: 0,
  name: "",
};

export function Vote({
  decision,
  userAllowedCredits,
  main,
}: {
  decision: QVote.ContractDecisionProcessed;
  userAllowedCredits: number;
  main: ReturnType<typeof useMainContext>;
}) {
  const router = useRouter();
  const responsiveContext = useContext(ResponsiveContext);
  const [loading, setLoading] = useState(false);
  const [curCredDist, setCurCredDist] = useState(
    createSlidersState(decision, userAllowedCredits)
  );
  const [showSlider, setShowSlider] = useState(false);
  const [sliderState, setSliderState] = useState<QVote.SliderDs>(sliderInit);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setCurCredDist(createSlidersState(decision, userAllowedCredits));
  }, [decision]);

  function reset() {
    setCurCredDist(createSlidersState(decision, userAllowedCredits));
    setSubmitted(false);
    setSliderState(sliderInit);
    setLoading(false);
    setShowSlider(false);
  }

  //update all except one option
  function updateByExcept(ds: QVote.CreditDist, curName: string, diff: number) {
    ds.options = ds.options.map((o) => {
      if (curName != o.name) {
        return {
          ...o,
          max: o.max - diff,
        };
      } else {
        return o;
      }
    });
  }

  //return number of credits used
  function getUsed(ds: QVote.CreditDist): number {
    return ds.options.reduce((prev, o) => {
      return prev + Math.abs(intPls(o.cur));
    }, 0);
  }

  const setSlider: onSliderConfirm = (name: string, newVal: number) => {
    const used = getUsed(curCredDist);
    const curIndex = curCredDist.options.findIndex((o) => o.name == name);
    const prevVal = Math.abs(intPls(curCredDist.options[curIndex].cur));
    const diff = Math.abs(newVal) - prevVal;
    updateByExcept(curCredDist, name, diff);
    curCredDist.options[curIndex].cur = newVal;
    curCredDist.creditsRemaining = userAllowedCredits - (diff + used);
    setCurCredDist(curCredDist);
    setShowSlider(false);
  };

  function showGivenSlider(name: string): void {
    const curIndex = curCredDist.options.findIndex((o) => o.name == name);
    if (
      curCredDist.creditsRemaining === 0 &&
      curCredDist.options[curIndex].cur === 0
    ) {
      return;
    }
    setSliderState(curCredDist.options[curIndex]);
    setShowSlider(true);
  }

  const canSubmit = () =>
    !loading &&
    curCredDist.creditsRemaining === 0 &&
    getUsed(curCredDist) !== 0;

  async function onVoteSubmit() {
    if (canSubmit()) {
      setLoading(true);
      try {
        const blockchainApi = new BlockchainApi({
          wallet: "zilPay",
          protocol: main.blockchainInfo.protocol,
        });
        const tx = await blockchainApi.vote(decision._this_address, {
          creditsToOption: curCredDist.options.map((o) => `${o.cur}`),
        });
        setSubmitted(true);
        main.jobsScheduler.checkContractCall({
          id: tx.ID,
          name: `Vote Transaction: ${tx.ID}`,
          status: "waiting",
          contractAddress: decision._this_address,
          type: "Vote",
        });
        main.longNotification.current.setLoading();
        main.longNotification.current.onShowNotification(
          "Waiting for transaction confirmation..."
        );
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
  }

  return submitted ? (
    <TransactionSubmitted
      onClick={() => router.push("/")}
      txt=""
      buttonLabel="Go to preview"
    />
  ) : (
    <TwoCards
      Card1={
        <Box fill>
          <QHeading>{"Vote"}</QHeading>
          <Heading
            style={{ wordBreak: "break-word" }}
            level={responsiveContext == "small" ? "3" : "2"}
          >
            {decision.name}
          </Heading>
          <QParagraph>{decision.description}</QParagraph>
          <QParagraph
            size="small"
            color={
              main.useContracts.contract.info.timeState ==
              "REGISTRATION_IN_PROGRESS"
                ? "status-critical"
                : main.useContracts.contract.info.timeState ==
                  "VOTING_IN_PROGRESS"
                ? "status-ok"
                : "status-critical"
            }
          >
            {main.useContracts.contract.info.timeState ==
            "REGISTRATION_IN_PROGRESS"
              ? `Registration period for this hasn't ended yet, ends in: ${main.useContracts.contract.info.time.registrationEnds.blocks} blocks, ~${main.useContracts.contract.info.time.registrationEnds.minutes} minutes.`
              : main.useContracts.contract.info.timeState ==
                "VOTING_IN_PROGRESS"
              ? `Voting ends in ${main.useContracts.contract.info.time.voteEnds.blocks} blocks, ~${main.useContracts.contract.info.time.voteEnds.minutes} minutes.`
              : "The voting period of this decision has ended."}
          </QParagraph>
        </Box>
      }
      Card2={
        <Box fill={true} gap="small">
          <CreditsLeft
            left={curCredDist.creditsRemaining}
            max={userAllowedCredits}
          />
          <ScrollBox props={{ gap: "small", pad: "medium" }}>
            {curCredDist.options.map((o, index) => {
              return (
                <PosWithMeters
                  {...{
                    onClick: () => showGivenSlider(o.name),
                    credits: intPls(curCredDist.options[index].cur),
                    maxCredits: userAllowedCredits,
                    optionName: o.name,
                    key: `posWithMeters ${o.name}`,
                  }}
                />
              );
            })}
          </ScrollBox>
          {showSlider && (
            <SliderModal
              {...{
                sliderState,
                setSlider,
                onClickOutside: () => setShowSlider(false),
                globalMax: userAllowedCredits,
              }}
            />
          )}
        </Box>
      }
      NextButton={
        <Box fill direction="row">
          <Box
            justify="center"
            align="center"
            pad={{ left: "small" }}
            fill
          ></Box>
          <Box align="center" justify="center" fill pad="small">
            <Button
              disabled={!canSubmit()}
              onClick={() => onVoteSubmit()}
              label={"Submit"}
            />
          </Box>
        </Box>
      }
    />
  );
}

function CreditsLeft({ left, max }: { left: number; max: number }) {
  return (
    <Box
      round="xsmall"
      height={{ min: "100px", max: "100px" }}
      align="center"
      justify="end"
      background="white"
      margin={{ left: "medium", right: "medium" }}
      pad={{ horizontal: "large" }}
    >
      <Heading
        responsive={false}
        textAlign="center"
        level="4"
        size="small"
      >{`Credits Left: ${left}`}</Heading>
      <Meters credits={left} maxCredits={max} onlyPos />
    </Box>
  );
}
