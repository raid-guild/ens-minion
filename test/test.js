const { expect } = require("chai");
const namehash = require('eth-ens-namehash');
const { sha3, toWei } = require('web3-utils');

const NULL_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

const timeTravel = async seconds => {
  await ethers.provider.send('evm_increaseTime', [seconds])
  await ethers.provider.send('evm_mine')
}

describe("MinionSubdomainRegistrar", function() {
  let accounts, ens, registrar, resolver, token, moloch, minion, minion2, minionRegistrar, minionRegistrar2, minionRegistrarInterface;

  before('Deploy contracts', async function() {
    accounts = await ethers.getSigners();
    const ENS = await ethers.getContractFactory("ENSRegistry");
    ens = await ENS.deploy();

    const BaseRegistrar = await ethers.getContractFactory("BaseRegistrarImplementation");
    registrar = await BaseRegistrar.deploy(ens.address, namehash.hash('eth'));

    const Resolver = await ethers.getContractFactory("TestResolver");
    resolver = await Resolver.deploy();

    await registrar.addController(accounts[0]._address)
    await ens.setSubnodeOwner(NULL_BYTES32, sha3('eth'), registrar.address);

    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy();

    await token.transfer(accounts[1]._address, toWei('100'));
    await token.transfer(accounts[2]._address, toWei('100'));

    const Moloch = await ethers.getContractFactory("Moloch");
    moloch = await Moloch.deploy(
      accounts[0]._address,
      [token.address],
      60,
      10,
      10,
      10,
      3,
      1
    );

    await token.connect(accounts[1]).approve(moloch.address, toWei('100'))
    await token.connect(accounts[2]).approve(moloch.address, toWei('100'))

    await moloch.connect(accounts[1]).submitProposal(accounts[1]._address, 100, 0, toWei('100'), token.address, 0, token.address, '')
    await moloch.connect(accounts[2]).submitProposal(accounts[2]._address, 100, 0, toWei('100'), token.address, 0, token.address, '')

    await token.approve(moloch.address, toWei('800'))
    await moloch.sponsorProposal(0)
    await moloch.sponsorProposal(1)

    await timeTravel(120)
    await moloch.submitVote(0, 1)
    await moloch.submitVote(1, 1)

    await timeTravel(1200)
    await moloch.processProposal(0)
    await moloch.processProposal(1)

    const Minion = await ethers.getContractFactory("Minion");
    minion = await Minion.deploy(moloch.address);
    minion2 = await Minion.deploy(moloch.address);

    const MinionSubdomainRegistrar = await ethers.getContractFactory("MinionSubdomainRegistrar")
    minionRegistrarInterface = MinionSubdomainRegistrar.interface
    minionRegistrar = await MinionSubdomainRegistrar.deploy(ens.address)
  })

  it("should register domain", async function() {
    await registrar.register(sha3("guildname"), accounts[1]._address, 86400);
    expect(await ens.owner(namehash.hash("guildname.eth"))).to.equal(accounts[1]._address);
    expect(await registrar.ownerOf(sha3("guildname"))).to.equal(accounts[1]._address);
  })

  it('should set up a domain', async function() {
    await registrar.connect(accounts[1]).approve(minionRegistrar.address, sha3('guildname'));
    await minionRegistrar.connect(accounts[1]).configureDomain('guildname', minion.address);
    expect(await ens.owner(namehash.hash('guildname.eth'))).to.equal(minionRegistrar.address);
    await minionRegistrar.connect(accounts[1]).setResolver('guildname', resolver.address);
    expect(await ens.resolver(namehash.hash('guildname.eth'))).to.equal(resolver.address);
  })

  it('should reconfigure domain (new minion)', async function() {
    await minionRegistrar.connect(accounts[1]).configureDomain('guildname', minion2.address);
    expect(await ens.owner(namehash.hash('guildname.eth'))).to.equal(minionRegistrar.address);
    await minionRegistrar.connect(accounts[1]).setResolver('guildname', resolver.address);
    expect(await ens.resolver(namehash.hash('guildname.eth'))).to.equal(resolver.address);
  })

  it('should register a subdomain', async function() {
    await minionRegistrar.register(sha3('guildname'), 'member', accounts[1]._address, resolver.address)
    expect(await ens.owner(namehash.hash('member.guildname.eth'))).to.equal(accounts[1]._address);
  })

  it('should fail to register a subdomain (name registered)', async function() {
    await expect(minionRegistrar.connect(accounts[2]).register(sha3('guildname'), 'member', accounts[2]._address, resolver.address)).to.be.revertedWith('')
    expect(await ens.owner(namehash.hash('member.guildname.eth'))).to.not.equal(accounts[2]._address);
  })

  it('should fail to register a subdomain (non-member)', async function() {
    await expect(minionRegistrar.connect(accounts[3]).register(sha3('guildname'), 'member2', accounts[3]._address, resolver.address)).to.be.revertedWith('')
    expect(await ens.owner(namehash.hash('member2.guildname.eth'))).to.not.equal(accounts[3]._address);
  })

  it('should register a subdomain (owner not set)', async function() {
    await minionRegistrar.connect(accounts[2]).register(sha3('guildname'), 'member2', NULL_ADDRESS, resolver.address)
    expect(await ens.owner(namehash.hash('member2.guildname.eth'))).to.equal(accounts[2]._address);
  })

  it('should return domain to owner', async function() {
    await minionRegistrar.connect(accounts[1]).unlistDomain('guildname')
    expect(await registrar.ownerOf(sha3('guildname'))).to.equal(accounts[1]._address)
    expect(await ens.owner(namehash.hash('guildname.eth'))).to.equal(accounts[1]._address);
  })

  it('should fail to register a subdomain (unlisted)', async function() {
    await expect(minionRegistrar.connect(accounts[2]).register(sha3('guildname'), 'othername', accounts[2]._address, resolver.address)).to.be.revertedWith('')
    expect(await ens.owner(namehash.hash('othername.guildname.eth'))).to.not.equal(accounts[2]._address);
  })

  it('should re-set up a domain', async function() {
    await registrar.connect(accounts[1]).approve(minionRegistrar.address, sha3('guildname'));
    await minionRegistrar.connect(accounts[1]).configureDomainFor('guildname', minion.address, accounts[0]._address);
    expect(await ens.owner(namehash.hash('guildname.eth'))).to.equal(minionRegistrar.address);
  })

  it('should fail to transfer internal control (not owner)', async function() {
    await expect(minionRegistrar.connect(accounts[2]).transfer('guildname', accounts[1]._address)).to.be.revertedWith('')
  })

  it('should transfer internal control of domain', async function() {
    await minionRegistrar.transfer('guildname', accounts[1]._address)
    expect(await minionRegistrar.owner(sha3('guildname'))).to.equal(accounts[1]._address)
  })

  it('should transfer registrar to new owner', async function() {
    await minionRegistrar.transferOwnership(accounts[1]._address)
    expect(await minionRegistrar.registrarOwner()).to.equal(accounts[1]._address)
  })

  it('should fail to migrate domain (registrar not stopped)', async function() {
    await expect(minionRegistrar.connect(accounts[1]).migrate('guildname')).to.be.revertedWith('')
  })

  it('should fail to set migration address (not stopped)', async function() {
    await expect(minionRegistrar.connect(accounts[1]).setMigrationAddress(NULL_ADDRESS)).to.be.revertedWith('')
  })

  it('should fail to stop registrar (not owner)', async function() {
    await expect(minionRegistrar.connect(accounts[2]).stop()).to.be.revertedWith('')
  })

  it('should stop registar', async function() {
    await minionRegistrar.connect(accounts[1]).stop()
    expect(await minionRegistrar.stopped()).to.equal(true)
  })

  it('should fail to register subdomain (stopped)', async function() {
    await expect(minionRegistrar.connect(accounts[2]).register(sha3('guildname'), 'member2', accounts[3]._address, resolver.address)).to.be.revertedWith('')
  })

  it('should fail to migrate domain (migration address not set)', async function() {
    await expect(minionRegistrar.connect(accounts[1]).migrate('guildname')).to.be.revertedWith('')
  })

  it('should create a new minion registar', async function() {
    const MinionSubdomainRegistrar = await ethers.getContractFactory("MinionSubdomainRegistrar")
    minionRegistrar2 = await MinionSubdomainRegistrar.deploy(ens.address)
    await minionRegistrar.connect(accounts[1]).setMigrationAddress(minionRegistrar2.address)
    expect(await minionRegistrar.migration()).to.equal(minionRegistrar2.address)
  })

  it('should migrate domain', async function() {
    await minionRegistrar.connect(accounts[1]).migrate('guildname')
    expect(await ens.owner(namehash.hash('guildname.eth'))).to.equal(minionRegistrar2.address);
    await minionRegistrar2.connect(accounts[1]).setResolver('guildname', resolver.address);
    expect(await ens.resolver(namehash.hash('guildname.eth'))).to.equal(resolver.address);
  })

  it('should register subdomain via minion', async function() {
    const encodedHexData = minionRegistrarInterface.functions.register.encode([sha3('guildname'), 'moloch', moloch.address, resolver.address])
    await minion.proposeAction(minionRegistrar2.address, 0, encodedHexData, 'Register moloch.guildname.eth to Moloch contract')
    await moloch.sponsorProposal(2)

    await timeTravel(120)
    await moloch.submitVote(2, 1)
    await moloch.connect(accounts[1]).submitVote(2, 1)
    await moloch.connect(accounts[2]).submitVote(2, 1)

    await timeTravel(1200)
    await moloch.processProposal(2)

    await minion.executeAction(2)
    expect(await ens.owner(namehash.hash('moloch.guildname.eth'))).to.equal(moloch.address);
  })
})
