import { expect } from 'chai';
import { ethers } from 'hardhat';
import { IUniswapV2Factory, IUniswapV2Router02, Gradient, WETH9 } from '../typechain-types';
import { BigNumber } from 'bignumber.js';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
//@ts-ignore
import { expectRevert, expectEvent } from '@openzeppelin/test-helpers';
import { time } from "@nomicfoundation/hardhat-network-helpers";

let account: SignerWithAddress;
let anotherAccount: SignerWithAddress;

describe('ERC20 Basic Test', async function () {
    let token: Gradient;
    let initialSupply = '14000000';

    beforeEach(async function () {
        [account, anotherAccount] = await ethers.getSigners();

        const Token = await ethers.getContractFactory('Gradient');
        token = (await Token.deploy()) as unknown as Gradient;
        await token.deployed();
    });

    describe('total supply', async function () {
        it('returns the total amount of tokens', async function () {
            const initialSupply = ethers.utils.parseEther('14000000');
            expect(await token.totalSupply()).to.equal(initialSupply);
        });
    });

    describe('balanceOf', async function () {
        describe('when the requested account has no tokens', function () {
            it('returns zero', async function () {
                expect(await token.balanceOf(anotherAccount.address)).to.be.equal('0');
            });
        });

        describe('when the requested account has some tokens', async function () {
            it('returns the total amount of tokens', async function () {
                expect(await token.balanceOf(account.address)).to.be.equal(ethers.utils.parseEther('14000000'));
            });
        });
    });

    describe('transfer', async function () {
        describe('when the recipient is not the zero address', function () {
            describe('when the sender does not have enough balance', function () {
                it('reverts', async function () {
                    const amount = ethers.utils.parseUnits(initialSupply, 18).add(10);
                    await expectRevert(token.transfer.call(this, anotherAccount.address, amount.toString()), `revert`);
                });
            });

            describe('when the sender transfers all balance', function () {
                it('transfers the requested amount', async function () {
                    await token.transfer.call(this, anotherAccount.address, ethers.utils.parseUnits(initialSupply, 18));

                    expect(await token.balanceOf(account.address)).to.be.equal('0');

                    expect(await token.balanceOf(anotherAccount.address)).to.be.equal(ethers.utils.parseEther(initialSupply));
                });

                it.skip('emits a transfer event', async function () {
                    const tx = await token.transfer.call(this, anotherAccount.address, ethers.utils.parseUnits(initialSupply, 18));
                    const receipt = await tx.wait();
                    expectEvent.inLogs(receipt.logs, 'Transfer', {
                        _from: account.address,
                        _to: anotherAccount.address,
                        _value: ethers.utils.parseUnits(initialSupply, 18)
                    });
                });
            });

            describe('when the sender transfers zero tokens', function () {
                const amount = '0';

                it('transfers the requested amount', async function () {
                    await token.transfer.call(this, anotherAccount.address, '0');

                    expect(await token.balanceOf(anotherAccount.address)).to.be.equal('0');

                    expect(await token.balanceOf(anotherAccount.address)).to.be.equal('0');
                });

                it.skip('emits a transfer event', async function () {
                    const tx = await token.transfer.call(this, anotherAccount.address, '0');
                    const receipt = await tx.wait();

                    console.log('receipt.logs', receipt.logs);

                    expectEvent.inLogs(receipt.logs, 'Transfer', {
                        _from: account.address,
                        _to: anotherAccount.address,
                        _value: amount
                    });
                });
            });
        });
    });

    describe('transfer from', async function () {
        describe('when the token owner is not the zero address', function () {
            describe('when the recipient is not the zero address', function () {
                describe('when the spender has enough approved balance', function () {
                    beforeEach(async function () {
                        await token.approve(anotherAccount.address, ethers.utils.parseEther(initialSupply), {
                            from: account.address
                        });
                    });

                    describe('when the token owner has enough balance', function () {
                        const amount = initialSupply;

                        it('transfers the requested amount', async function () {
                            await token.connect(anotherAccount).transferFrom(account.address, anotherAccount.address, ethers.utils.parseEther(initialSupply), {
                                from: anotherAccount.address
                            });

                            expect(await token.balanceOf(account.address)).to.be.equal('0');

                            expect(await token.balanceOf(anotherAccount.address)).to.be.equal(ethers.utils.parseEther(initialSupply));
                        });

                        it('decreases the spender allowance', async function () {
                            await token.connect(anotherAccount).transferFrom(account.address, anotherAccount.address, ethers.utils.parseEther(initialSupply), {
                                from: anotherAccount.address
                            });

                            expect(await token.allowance(account.address, anotherAccount.address)).to.be.equal('0');
                        });

                        it.skip('emits a transfer event', async function () {
                            const tx = await token
                                .connect(anotherAccount)
                                .transferFrom(account.address, anotherAccount.address, ethers.utils.parseEther(initialSupply), {
                                    from: anotherAccount.address
                                });
                            const receipt = await tx.wait();
                            expectEvent.inLogs(receipt.logs, 'Transfer', {
                                _from: account.address,
                                _to: anotherAccount.address,
                                _value: amount
                            });
                        });

                        it.skip('emits an approval event', async function () {
                            const tx = await token
                                .connect(anotherAccount)
                                .transferFrom(account.address, anotherAccount.address, ethers.utils.parseEther(initialSupply), {
                                    from: anotherAccount.address
                                });
                            const receipt = await tx.wait();

                            expectEvent.inLogs(receipt.logs, 'Approval', {
                                owner: account.address,
                                _spender: anotherAccount.address,
                                value: await token.allowance(account.address, anotherAccount.address)
                            });
                        });
                    });

                    describe('when the token owner does not have enough balance', async function () {
                        it('reverts', async function () {
                            await expectRevert(
                                token
                                    .connect(anotherAccount)
                                    .transferFrom(account.address, anotherAccount.address, ethers.utils.parseEther(initialSupply).add('1234').toString(), {
                                        from: anotherAccount.address
                                    }),
                                `revert`
                            );
                        });
                    });
                });

                describe('when the spender does not have enough approved balance', async function () {
                    beforeEach(async function () {
                        await token.approve(account.address, ethers.utils.parseEther(initialSupply).sub(1234).toString(), {
                            from: account.address
                        });
                    });

                    describe('when the token owner has enough balance', async function () {
                        const amount = initialSupply;

                        it('reverts', async function () {
                            await expectRevert(
                                token.connect(anotherAccount).transferFrom(account.address, anotherAccount.address, ethers.utils.parseEther(initialSupply), {
                                    from: anotherAccount.address
                                }),
                                `revert`
                            );
                        });
                    });

                    describe('when the token owner does not have enough balance', async function () {
                        it('reverts', async function () {
                            await expectRevert(
                                token
                                    .connect(anotherAccount)
                                    .transferFrom(account.address, anotherAccount.address, ethers.utils.parseEther(initialSupply).add(1234), {
                                        from: anotherAccount.address
                                    }),
                                `revert`
                            );
                        });
                    });
                });
            });

            describe('when the recipient is the zero address', async function () {
                const amount = initialSupply;
                const to = ethers.constants.AddressZero;

                beforeEach(async function () {
                    await token.approve(anotherAccount.address, ethers.utils.parseEther(amount), { from: account.address });
                });

                it('reverts', async function () {
                    await expectRevert(
                        token.connect(anotherAccount).transferFrom(account.address, to, amount, { from: anotherAccount.address }),
                        `revert`
                    );
                });
            });
        });

        describe('when the token owner is the zero address', async function () {
            const amount = 0;
            const tokenOwner = ethers.constants.AddressZero;

            it('reverts', async function () {
                await expectRevert(
                    token.connect(anotherAccount).transferFrom(tokenOwner, anotherAccount.address, amount, { from: anotherAccount.address }),
                    `revert`
                );
            });
        });
    });

    describe('when the spender is not the zero address', async function () {
        const amount = ethers.utils.parseEther(initialSupply);
        const owner = account.address;
        const spender = anotherAccount.address;
        describe('when the sender has enough balance', async function () {
            describe('when there was no approved amount before', async function () {
                it('approves the requested amount', async function () {
                    await token.approve.call(this, spender, amount);

                    expect(await token.allowance(owner, spender)).to.be.equal(amount);
                });
            });

            describe('when the spender had an approved amount', async function () {
                beforeEach(async function () {
                    await token.approve.call(this, spender, 1);
                });

                it('approves the requested amount and replaces the previous one', async function () {
                    await token.approve.call(this, spender, amount);

                    expect(await token.allowance(owner, spender)).to.be.equal(amount);
                });
            });
        });

        describe('when the sender does not have enough balance', async function () {
            const amount = ethers.utils.parseEther(initialSupply).add(1234);

            describe('when there was no approved amount before', async function () {
                it('approves the requested amount', async function () {
                    await token.approve.call(this, spender, amount);

                    expect(await this.token.allowance(owner, spender)).to.be.equal(amount);
                });
            });

            describe('when the spender had an approved amount', async function () {
                beforeEach(async function () {
                    await token.approve.call(this, spender, 1);
                });

                it('approves the requested amount and replaces the previous one', async function () {
                    await token.approve.call(this, spender, amount);

                    expect(await token.allowance(owner, spender)).to.be.equal(amount);
                });
            });
        });
    });

    describe('when the spender is the zero address', async function () {
        it('reverts', async function () {
            await expectRevert(token.approve.call(this, ethers.constants.AddressZero, ethers.utils.parseEther(initialSupply)), `revert`);
        });
    });

    describe('snipers should get rekt', async function () {
        let snipeFee = 3333;
        let divisor = 10000;
        let uniRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
        let uniFactory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
        let wethAddy = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
        let router: IUniswapV2Router02;
        let factory: IUniswapV2Factory;
        let weth: WETH9;

        beforeEach(async function () {
            router = (await ethers.getContractAt('UniswapV2Router02', uniRouter)) as unknown as IUniswapV2Router02;
            factory = (await ethers.getContractAt('UniswapV2Factory', uniFactory)) as unknown as IUniswapV2Factory;
            weth = (await ethers.getContractAt('WETH9', wethAddy)) as unknown as WETH9;
            await token.setFundingFee(snipeFee);
        });

        it('should only apply snipe fee if block.timestamp <= thresholdTimestamp', async function () {
            const transferAmount = ethers.utils.parseUnits('1000', 18);
            

            await token.approve(router.address, ethers.utils.parseEther('7000000'));
            let tx = await router.addLiquidityETH(
                token.address,
                ethers.utils.parseEther('7000000'),
                ethers.utils.parseEther('0'),
                ethers.utils.parseUnits('1', 18),
                account.address,
                Math.floor(Date.now() / 1000) + 60 * 20,
                { value: ethers.utils.parseUnits('1', 18) }
            );
            await tx.wait();

            const pair = await factory.getPair(wethAddy, token.address);

            const futureTimestamp = (await ethers.provider.getBlock('latest')).timestamp + 10000;
            await token.setThreshold(futureTimestamp);
            // console.log('threshold after', await token.thresholdTimestamp())
            // console.log('pair, uniRouter, wethAddy, token.address', pair, uniRouter, wethAddy, token.address);
            await token.addPair(pair, uniRouter, wethAddy);

            const tributeHolder = await token.tributeHolder();
            expect(tributeHolder).to.equal(account.address);

            expect(await weth.balanceOf(account.address)).to.equal(0);

            const buy = await router
                .connect(anotherAccount)
                .swapETHForExactTokens(
                    ethers.utils.parseEther('1000'),
                    [wethAddy, token.address],
                    anotherAccount.address,
                    Math.floor(Date.now() / 1000) + 60 * 20,
                    { value: ethers.utils.parseEther('0.1') }
                );
            await buy.wait();

            const tokenBal = await token.balanceOf(anotherAccount.address);

            // get sell quote
            const sellQuote = await router.getAmountsOut(tokenBal.mul(snipeFee).div(divisor), [token.address, wethAddy]);
            const expectedFee = sellQuote[1]//.mul(snipeFee).div(divisor);
            const expectedTransferAmount = transferAmount.sub(expectedFee);

            await token.connect(anotherAccount).approve(router.address, ethers.utils.parseEther('10000'));

            const sell = await router
                .connect(anotherAccount)
                .swapExactTokensForETHSupportingFeeOnTransferTokens(
                  transferAmount,
                    0,
                    [token.address, wethAddy],
                    anotherAccount.address,
                    Math.floor(Date.now() / 1000) + 60 * 20
                );
            await sell.wait();

            expect(await token.balanceOf(anotherAccount.address)).to.equal(0);
            const feeCollectorBalAfterSnipeFeeSell = await weth.balanceOf(account.address);
            expect(feeCollectorBalAfterSnipeFeeSell).to.equal(expectedFee);

            await time.increase(20000);

            const buy2 = await router
            .connect(anotherAccount)
            .swapETHForExactTokens(
                ethers.utils.parseEther('1000'),
                [wethAddy, token.address],
                anotherAccount.address,
                Math.floor(Date.now() / 1000) + 60 * 20 + 20000,
                { value: ethers.utils.parseEther('0.1') }
            );
            await buy2.wait();

            const sell2 = await router
                .connect(anotherAccount)
                .swapExactTokensForETHSupportingFeeOnTransferTokens(
                  transferAmount,
                    0,
                    [token.address, wethAddy],
                    anotherAccount.address,
                    Math.floor(Date.now() / 1000) + 60 * 20 + 20000
                );
            await sell2.wait();

            const feeCollectorBalAfterNormalSell = await weth.balanceOf(account.address);
            expect(feeCollectorBalAfterSnipeFeeSell).to.equal(feeCollectorBalAfterNormalSell);

        });
    });
});
