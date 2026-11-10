import { processAdvisorMessage } from "../src/lib/llm/gemini";

async function main() {
  console.log("Testing Advisor Step 1...");
  const res1 = await processAdvisorMessage("I run a dental clinic with 4 employees in Delhi", [], {}, "en");
  console.log("Turn 1 Reply:\n", res1.reply);
  console.log("Turn 1 Quick Replies:\n", res1.quickReplies);

  console.log("\nTesting Advisor Step 2...");
  const res2 = await processAdvisorMessage("We do not have a GSTIN yet", [], res1.updatedProfile, "en");
  console.log("Turn 2 Reply:\n", res2.reply);
  console.log("Recommendation Ready:", res2.recommendation?.ready);

  if (res2.recommendation?.quote) {
    console.log("Bundle:", res2.recommendation.bundleName);
    console.log("Monthly Grand Total:", res2.recommendation.quote.grand_monthly_total);
    console.log("Why reasons:", res2.recommendation.whyReasons);
  }

  console.log("\n✅ Advisor test completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
