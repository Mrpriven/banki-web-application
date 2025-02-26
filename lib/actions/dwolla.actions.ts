"use server";

import { Client } from "dwolla-v2";
import us from 'us';

const getEnvironment = (): "production" | "sandbox" => {
  const environment = process.env.DWOLLA_ENV as string;

  switch (environment) {
    case "sandbox":
      return "sandbox";
    case "production":
      return "production";
    default:
      throw new Error(
        "Dwolla environment should either be set to `sandbox` or `production`"
      );
  }
};

const dwollaClient = new Client({
  environment: getEnvironment(),
  key: process.env.DWOLLA_KEY as string,
  secret: process.env.DWOLLA_SECRET as string,
});

// Create a Dwolla Funding Source using a Plaid Processor Token
export const createFundingSource = async (
  options: CreateFundingSourceOptions
) => {
  try {
    const response = await dwollaClient.post(
      `customers/${options.customerId}/funding-sources`,
      {
        name: options.fundingSourceName,
        plaidToken: options.plaidToken,
      }
    );
    return response.headers.get("location");
  } catch (err) {
    console.error("Creating a Funding Source Failed: ", err);
    throw new Error("Failed to create funding source");
  }
};

export const createOnDemandAuthorization = async () => {
  try {
    const response = await dwollaClient.post("on-demand-authorizations");
    return response.body._links;
  } catch (err) {
    console.error("Creating an On Demand Authorization Failed: ", err);
    throw new Error("Failed to create on-demand authorization");
  }
};

export const createDwollaCustomer = async (
  newCustomer: NewDwollaCustomerParams
) => {
  try {
    // Convert full state name to 2-letter abbreviation
    const stateAbbreviation = us.lookup(newCustomer.state)?.abbr || newCustomer.state;

    if (!stateAbbreviation || stateAbbreviation.length !== 2) {
      throw new Error("State must be a 2-letter abbreviation");
    }

    // Log the data being sent to Dwolla for debugging
    console.log("Creating Dwolla customer with data:", {
      ...newCustomer,
      state: stateAbbreviation,
    });

    const response = await dwollaClient.post("customers", {
      ...newCustomer,
      state: stateAbbreviation, // Ensure the state is in the correct format
    });

    return response.headers.get("location");
  } catch (err) {
    console.error("Creating a Dwolla Customer Failed: ", err);
    throw new Error(`Failed to create Dwolla customer: ${err.message}`);
  }
};

export const createTransfer = async ({
  sourceFundingSourceUrl,
  destinationFundingSourceUrl,
  amount,
}: TransferParams) => {
  try {
    const requestBody = {
      _links: {
        source: {
          href: sourceFundingSourceUrl,
        },
        destination: {
          href: destinationFundingSourceUrl,
        },
      },
      amount: {
        currency: "USD",
        value: amount,
      },
    };
    const response = await dwollaClient.post("transfers", requestBody);
    return response.headers.get("location");
  } catch (err) {
    console.error("Transfer fund failed: ", err);
    throw new Error("Failed to create transfer");
  }
};

export const addFundingSource = async ({
  dwollaCustomerId,
  processorToken,
  bankName,
}: AddFundingSourceParams) => {
  try {
    // Create Dwolla auth link
    const dwollaAuthLinks = await createOnDemandAuthorization();

    // Add funding source to the Dwolla customer & get the funding source URL
    const fundingSourceOptions = {
      customerId: dwollaCustomerId,
      fundingSourceName: bankName,
      plaidToken: processorToken,
      _links: dwollaAuthLinks,
    };
    return await createFundingSource(fundingSourceOptions);
  } catch (err) {
    console.error("Transfer fund failed: ", err);
    throw new Error("Failed to add funding source");
  }
};