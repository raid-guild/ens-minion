// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const ensAddress = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"

async function main() {
  // Buidler always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await bre.run('compile');
  const MinionSubdomainRegistrar = await ethers.getContractFactory("MinionSubdomainRegistrar")
  //const minionRegistrarInterface = MinionSubdomainRegistrar.interface
  const minionRegistrar = await MinionSubdomainRegistrar.deploy(ensAddress)
  console.log('Minion Subdomain Registrar: ', minionRegistrar.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
