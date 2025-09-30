import { ethers } from 'ethers';
import inquirer from 'inquirer';
import chalk from 'chalk';

export class WalletHelper {
  static async getSigner() {
    const { authMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Choose wallet authentication method:',
        choices: [
          { name: '🔑 Private Key', value: 'privateKey' },
          { name: '🗝️  Mnemonic Phrase', value: 'mnemonic' },
          { name: '📁 Keystore File', value: 'keystore' }
        ]
      }
    ]);

    switch (authMethod) {
      case 'privateKey':
        return await this.getSignerFromPrivateKey();
      case 'mnemonic':
        return await this.getSignerFromMnemonic();
      case 'keystore':
        return await this.getSignerFromKeystore();
      default:
        throw new Error('Invalid authentication method');
    }
  }

  static async getSignerFromPrivateKey() {
    const { privateKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'privateKey',
        message: 'Enter your private key:',
        mask: '*',
        validate: (input) => {
          try {
            new ethers.Wallet(input);
            return true;
          } catch {
            return 'Invalid private key format';
          }
        }
      }
    ]);

    return new ethers.Wallet(privateKey);
  }

  static async getSignerFromMnemonic() {
    const { mnemonic, derivationPath } = await inquirer.prompt([
      {
        type: 'password',
        name: 'mnemonic',
        message: 'Enter your mnemonic phrase:',
        mask: '*',
        validate: (input) => {
          try {
            ethers.Mnemonic.fromPhrase(input);
            return true;
          } catch {
            return 'Invalid mnemonic phrase';
          }
        }
      },
      {
        type: 'input',
        name: 'derivationPath',
        message: 'Enter derivation path (or press Enter for default):',
        default: "m/44'/60'/0'/0/0"
      }
    ]);

    return ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(mnemonic),
      derivationPath
    );
  }

  static async getSignerFromKeystore() {
    const { keystorePath, password } = await inquirer.prompt([
      {
        type: 'input',
        name: 'keystorePath',
        message: 'Enter path to keystore file:',
        validate: (input) => {
          try {
            require('fs').accessSync(input, require('fs').constants.R_OK);
            return true;
          } catch {
            return 'File not found or not readable';
          }
        }
      },
      {
        type: 'password',
        name: 'password',
        message: 'Enter keystore password:',
        mask: '*'
      }
    ]);

    const keystoreJson = require('fs').readFileSync(keystorePath, 'utf8');
    return await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
  }

  static formatAddress(address) {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static async signMessage(signer, message) {
    console.log(chalk.blue('📝 Signing message with wallet...'));
    const signature = await signer.signMessage(message);
    console.log(chalk.green('✅ Message signed successfully'));
    return signature;
  }
}