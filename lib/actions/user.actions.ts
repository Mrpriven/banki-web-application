import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

// Get user info by userId
export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    if (!user || !user.documents || user.documents.length === 0) {
      throw new Error("User not found");
    }

    // Convert the user object to a plain object
    return parseStringify(user.documents[0]);
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

// Sign in user
export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    if (!session) {
      throw new Error("Error creating session");
    }

    console.log("Session created:", session);

    // Call an API route to set the session cookie
    const response = await fetch("/api/set-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session: session.secret }),
    });

    if (!response.ok) {
      throw new Error("Failed to set session cookie");
    }

    const user = await getUserInfo({ userId: session.userId });

    if (!user) {
      throw new Error("Error fetching user info");
    }

    console.log("User info retrieved:", user);

    // Return the plain user object
    return user;
  } catch (error) {
    console.error("Error during sign-in:", error);
    throw error; // Re-throw the error to handle it in the calling function
  }
};

// Sign up user
export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;
  
  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(), 
      email, 
      password, 
      `${firstName} ${lastName}`
    );

    if (!newUserAccount) {
      throw new Error("Error creating user in Appwrite");
    }

    console.log("User created in Appwrite:", newUserAccount);

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal'
    });

    if (!dwollaCustomerUrl) {
      throw new Error("Error creating Dwolla customer");
    }

    console.log("Dwolla customer created:", dwollaCustomerUrl);

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl
      }
    );

    if (!newUser) {
      throw new Error("Error creating user document in database");
    }

    console.log("User document created in database:", newUser);

    // Call an API route to set the session cookie
    const session = await account.createEmailPasswordSession(email, password);
    const response = await fetch("/api/set-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session: session.secret }),
    });

    if (!response.ok) {
      throw new Error("Failed to set session cookie");
    }

    // Return the plain newUser object
    return parseStringify(newUser);
  } catch (error) {
    console.error("Error during sign-up:", error);
    throw error; // Re-throw the error to handle it in the calling function
  }
};

// Get logged-in user
export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result = await account.get();

    if (!result) {
      throw new Error("Error fetching user session");
    }

    console.log("User session retrieved:", result);

    const user = await getUserInfo({ userId: result.$id });

    if (!user) {
      throw new Error("Error fetching user info");
    }

    console.log("User info retrieved:", user);

    // Return the plain user object
    return user;
  } catch (error) {
    console.error("Error fetching logged-in user:", error);
    return null;
  }
};

// Logout user
export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    // Call an API route to delete the session cookie
    const response = await fetch("/api/delete-session", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to delete session cookie");
    }

    await account.deleteSession('current');
  } catch (error) {
    console.error("Error during logout:", error);
    return null;
  }
};

// Create a Plaid link token
export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);

    // Return the plain link token object
    return parseStringify({ linkToken: response.data.link_token });
  } catch (error) {
    console.error("Error creating Plaid link token:", error);
    return null;
  }
};

// Create a bank account
export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  sharableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        sharableId,
      }
    );

    // Return the plain bank account object
    return parseStringify(bankAccount);
  } catch (error) {
    console.error("Error creating bank account:", error);
    return null;
  }
};

// Exchange Plaid public token
export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    // Exchange public token for access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    
    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });
    
    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw new Error("Error creating funding source URL");

    // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and shareableId ID
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      sharableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("An error occurred while exchanging token:", error);
    return null;
  }
};

// Get banks by userId
export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();

    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    // Return the plain banks object
    return parseStringify(banks.documents);
  } catch (error) {
    console.error("Error fetching banks:", error);
    return null;
  }
};

// Get bank by documentId
export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [documentId])]
    );

    // Return the plain bank object
    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("Error fetching bank:", error);
    return null;
  }
};

// Get bank by accountId
export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('accountId', [accountId])]
    );

    if (bank.total !== 1) return null;

    // Return the plain bank object
    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("Error fetching bank by account ID:", error);
    return null;
  }
};