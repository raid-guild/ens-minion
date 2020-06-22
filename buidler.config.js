usePlugin("@nomiclabs/buidler-waffle");
usePlugin('solidity-coverage');

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  networks: {
    kovan: {
      url: "https://kovan.infura.io/v3/9207b788fe0e4fe19499d8832999ea7e",
      accounts: {
        mnemonic: "antique found bounce pull void best work ladder tomato else version velvet charge fame shoulder"
      }
    },
    coverage: {
      url: 'http://localhost:8555'
    }
  },
  solc: {
    version: "0.5.12",
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
