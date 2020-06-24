// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const namehash = require('eth-ens-namehash')
const { sha3 } = require('web3-utils')

const NULL_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
const minionAddress = "0x98B550E95E90ADFA6D9841fAB937D81FcFEab6D2"

async function main() {
  // Buidler always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await bre.run('compile');
  const accounts = await ethers.getSigners()

  const ENS = await ethers.getContractFactory("ENSRegistry")
  const ens = await ENS.deploy()
  console.log('ENS: ', ens.address)

  const BaseRegistrar = await ethers.getContractFactory("BaseRegistrarImplementation")
  const registrar = await BaseRegistrar.deploy(ens.address, namehash.hash('eth'))
  console.log('ETH Registrar: ', registrar.address)

  const Resolver = await ethers.getContractFactory("TestResolver")
  const resolver = await Resolver.deploy()
  console.log('Resolver: ', resolver.address)

  await registrar.addController(accounts[0]._address)
  await ens.setSubnodeOwner(NULL_BYTES32, sha3('eth'), registrar.address)

  const MinionSubdomainRegistrar = await ethers.getContractFactory("MinionSubdomainRegistrar")
  //const minionRegistrarInterface = MinionSubdomainRegistrar.interface
  const minionRegistrar = await MinionSubdomainRegistrar.deploy(ens.address)
  console.log('Minion Subdomain Registrar: ', minionRegistrar.address)

  await registrar.register(sha3("raidguild"), accounts[0]._address, 31536000)
  console.log('Registered raidguild')
  await registrar.approve(minionRegistrar.address, sha3('raidguild'))
  console.log('Approved domain transfer')
  await minionRegistrar.configureDomain('raidguild', minionAddress)
  console.log('Configured domain')
  await minionRegistrar.setResolver('raidguild', resolver.address)
  console.log('Set resolver')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
