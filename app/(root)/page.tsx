import HeaderBox from '@/components/HeaderBox';
import RecentTransactions from '@/components/RecentTransactions';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;

  // Fetch logged-in user
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) {
    console.error("User not logged in.");
    return;
  }

  // Fetch user accounts
  const accounts = await getAccounts({ 
    userId: loggedIn.$id 
  });
  if (!accounts || !accounts.data) {
    console.error("No accounts found for user:", loggedIn.$id);
    return;
  }

  const accountsData = accounts.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;

  if (!appwriteItemId) {
    console.error("No appwriteItemId found.");
    return;
  }

  // Fetch account details
  let account;
  try {
    account = await getAccount({ appwriteItemId });
  } catch (error) {
    console.error("Failed to fetch account:", error);
    return;
  }

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox 
            accounts={accountsData}
            totalBanks={accounts?.totalBanks || 0}
            totalCurrentBalance={accounts?.totalCurrentBalance || 0}
          />
        </header>

        <RecentTransactions 
          accounts={accountsData}
          transactions={account?.transactions || []}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      <RightSidebar 
        user={loggedIn}
        transactions={account?.transactions || []}
        banks={accountsData?.slice(0, 2) || []}
      />
    </section>
  );
};

export default Home;