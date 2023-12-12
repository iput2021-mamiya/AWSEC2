import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { SubnetAttributes } from 'aws-cdk-lib/aws-ec2';
import {Construct} from 'constructs';

interface RdsSettings {
    rdsName: string;
    username: string;
    subnet: string[];
    dbSecurity: string;
    engineType: string;
    subnetGroupName: string;
    dbSubnetGroupDescription: string;
    endpointName: string;
    secretsmanagerName: string;
    excludePunctuation: boolean;
    includeSpace: boolean;
    generateStringKey: string;
    defaultDatabaseName: string;
    engineVersion: string;
    instanceClass: string,
    instanceSize: string,
    removalPolicy: string;
}

// RDSクラス
export class Rds extends Construct{
    private _rds: rds.DatabaseInstance;
    private _vpc: ec2.Vpc;
    private _sgdb: { [name: string]: ec2.SecurityGroup };
    private subid: { [key: string]: SubnetAttributes }

    // getterメソッド
    public get rds(): rds.DatabaseInstance {
        return this._rds;
    }


    constructor(scope: Construct, id: string, vpc: ec2.Vpc, sgdb: { [name: string]: ec2.SecurityGroup }, subnetId: { [key: string]: ec2.SubnetAttributes }) {
        super(scope, id);
        this._vpc = vpc;
        this._sgdb = sgdb;
        const defaultRdsSettings = scope.node.tryGetContext('defaultRdsSettings');
        const RdsName = defaultRdsSettings.rdsName;
        this.subid = subnetId;

        // データベースクレデンシャルを作成
        const secret = new secretsmanager.Secret(scope, defaultRdsSettings.secretsmanagerName, {
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: defaultRdsSettings.username }),
                excludePunctuation: defaultRdsSettings.excludePunctuation,
                includeSpace: defaultRdsSettings.includeSpace,
                generateStringKey: defaultRdsSettings.generateStringKey,
            },
        });

        this._rds = this.createDatabaseInstance(scope, RdsName, this._vpc, secret, defaultRdsSettings);
        
        // エンドポイントをエクスポート
        new cdk.CfnOutput(scope, defaultRdsSettings.endpointName, {
            value: this._rds.dbInstanceEndpointAddress,
        });
    }

    // RDS作成メソッド
    private createDatabaseInstance(scope: Construct, id: string, vpc: ec2.Vpc, secret: secretsmanager.ISecret, defaultRdsSettings:RdsSettings): rds.DatabaseInstance {
        const securityGroupNames = defaultRdsSettings.dbSecurity;
        const matchedSgs = this._sgdb[securityGroupNames];
        // サブネットの情報を取得
        const subnets = defaultRdsSettings.subnet.map(subnetName => {
            const attributes: SubnetAttributes = {
              ...this.subid[subnetName],
            };
            return ec2.Subnet.fromSubnetAttributes(this, `subnet-${subnetName}`, attributes);
          });
    
        let engine;
        const rdsEngine = defaultRdsSettings.engineType;
        const rdsEngineVersion = defaultRdsSettings.engineVersion;
        if (rdsEngine === 'mysql') {
            const fullVersion = rdsEngineVersion;                   // フルバージョンを指定
            const majorVersion = rdsEngineVersion.split('.')[0];    // メジャーバージョンを指定
            engine = rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.of(fullVersion, majorVersion) });
        } else if (rdsEngine === 'postgres') {
            const fullVersion = rdsEngineVersion;                   // フルバージョンを指定
            const majorVersion = rdsEngineVersion.split('.')[0];    // メジャーバージョンを指定
            engine = rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.of(fullVersion, majorVersion) });
        } else {
            throw new Error(`Unsupported engine version: ${defaultRdsSettings.engineVersion}`);
        }

        // インスタンスクラスの設定
        const instanceClassMap: { [id: string]: ec2.InstanceClass } = {
            'M7G': ec2.InstanceClass.M7G,
            'M6G': ec2.InstanceClass.M6G,
            'M6GD': ec2.InstanceClass.M6GD,
            'M6ID': ec2.InstanceClass.M6ID,
            'M6I': ec2.InstanceClass.M6I,
            'M5D': ec2.InstanceClass.M5D,
            'M5': ec2.InstanceClass.M5,
            'M4': ec2.InstanceClass.M4,
            'M3': ec2.InstanceClass.M3,
            'X2G': ec2.InstanceClass.X2G,
            'X2IDN': ec2.InstanceClass.X2IDN,
            'X2IEDN': ec2.InstanceClass.X2IEDN,
            'R7G': ec2.InstanceClass.R7G,
            'R6G': ec2.InstanceClass.R6G,
            'R6GD': ec2.InstanceClass.R6GD,
            'R6ID': ec2.InstanceClass.R6ID,
            'R6I': ec2.InstanceClass.R6I,
            'R5D': ec2.InstanceClass.R5D,
            'T2': ec2.InstanceClass.T2,
        };
        
        let instanceClass = instanceClassMap[defaultRdsSettings.instanceClass];
        
        if (!instanceClass) {
            throw new Error(`Unsupported instance class: ${defaultRdsSettings.instanceClass}`);
        }

        // インスタンスサイズの設定
        const instanceSizeMap: { [id: string]: ec2.InstanceSize } = {
            'MICRO': ec2.InstanceSize.MICRO,
            'SMALL': ec2.InstanceSize.SMALL,
            'MEDIUM': ec2.InstanceSize.MEDIUM,
            'LARGE': ec2.InstanceSize.LARGE,
            'XLARGE': ec2.InstanceSize.XLARGE,
            '2XLARGE': ec2.InstanceSize.XLARGE2,
            '4XLARGE': ec2.InstanceSize.XLARGE4,
            '8XLARGE': ec2.InstanceSize.XLARGE8,
            '12XLARGE': ec2.InstanceSize.XLARGE12,
            '16XLARGE': ec2.InstanceSize.XLARGE16,
            '24XLARGE': ec2.InstanceSize.XLARGE24,
            '32XLARGE': ec2.InstanceSize.XLARGE32,
        };
        
        let instanceSize = instanceSizeMap[defaultRdsSettings.instanceSize];
        
        if (!instanceSize) {
            throw new Error(`Unsupported instance size: ${defaultRdsSettings.instanceSize}`);
        }

        // リムーバルポリシーの設定
        let removalPolicy;
        switch (defaultRdsSettings.removalPolicy) {
        case 'DESTROY':
            removalPolicy = cdk.RemovalPolicy.DESTROY;
            break;
        case 'RETAIN':
            removalPolicy = cdk.RemovalPolicy.RETAIN;
            break;
        default:
            removalPolicy = cdk.RemovalPolicy.SNAPSHOT;
        }
        return new rds.DatabaseInstance(scope, id, {
            engine: engine,
            instanceType: ec2.InstanceType.of(instanceClass, instanceSize),
            vpc,
            vpcSubnets: {
                subnets: subnets
            },
            securityGroups: [matchedSgs],
            databaseName: defaultRdsSettings.defaultDatabaseName,
            removalPolicy: removalPolicy,
            // データベースクレデンシャルを指定
            credentials: rds.Credentials.fromSecret(secret),
        });
    }   
}