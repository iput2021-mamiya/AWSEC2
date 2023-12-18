## 概要
このプロジェクトは、AWS Cloud Development Kit (AWS CDK)を使用してAmazon EC2+ALB+RDSの作成が出来ます。

## 構成
![Ec2composition](https://github.com/iput2021-mamiya/AWSEC2/assets/130954520/fcd69a57-344e-4b14-8d4d-51959ca9ebc1)
## 必要条件
- Node.js 10.3.0以上
- Tyepscript
- AWSアカウント
- AWS CLI
- AWS CDK

## セットアップ
1. リポジトリをクローンします：`git clone https://github.com/iput2021-mamiya/AWSEC2.git`
2. ディレクトリに移動します：`cd your-repo-name/AWSEC2`
3. 必要な依存関係をインストールします：`npm install`
4. AWS CDKをグローバルにインストールします（まだインストールしていない場合）：`npm install -g aws-cdk`
5. AWS CLIを使用してAWSにログインします：`aws configure`

## 使用方法
1. 自分の好みの設定値をcdk.jsonで設定します
2. スタックをデプロイします：`cdk deploy`
3. スタックを削除します：`cdk destroy`

## ライセンス
このプロジェクトはMITライセンスの下でライセンスされています。

協力者
1. Yamamoto Teppei
