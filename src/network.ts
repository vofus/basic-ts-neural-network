import nj, { NdArray, reshape } from "numjs";
import ndarray from "ndarray";
import { getRandomInt } from "./utils";
import { ActivationStrategy, Sigmoid } from "./activators";

interface INetwork {
	train(trainSet: TrainSet, count: number, activator?: ActivationStrategy): void;
	query(inputs: number[]): any;
}

interface IForwardResult {
	hiddenOutputs: NdArray;
	finalOutputs: NdArray;
}

export interface ITrainItem {
	inputs: number[];
	targets: number[];
}

export type TrainSet = ITrainItem[];

export class Network implements INetwork {
	// Матрица весов между входным и скрытым слоем
	private weightsIH: NdArray;
	// Матрица весов между скрытым и выходным слоем
	private weightsHO: NdArray;
	// Объект-активатор (По умолчанию сигмоида)
	private activator: ActivationStrategy = new Sigmoid();

	constructor(
		private inputSize: number,
		private hiddenSize: number,
		private outputSize: number,
		private LR: number = 0.3
	) {
		this.weightsIH = this.generateWeights(hiddenSize, inputSize);
		this.weightsHO = this.generateWeights(outputSize, hiddenSize);
	}

	/**
	 * Тренируем сеть
	 * @param trainSet {TrainSet} тренировочная выборка
	 * @param count {number} количество итераций
	 * @param activator {ActivationStrategy} объект-активатор
	 */
	train(trainSet: TrainSet, count: number, activator?: ActivationStrategy): void {
		if (Boolean(activator)) {
			this.activator = activator;
		}

		let counter = count;
		while (counter > 0) {
			const randIndex = getRandomInt(0, trainSet.length);
			const { inputs, targets } = trainSet[randIndex];
			this.trainStep(inputs, targets);
			counter -= 1;
		}
	}

	/**
	 * Выполняем запрос к сети
	 * @param inputs {number[]} входные сигналы
	 */
	query(inputs: number[]): any {
		const inputMatrix = nj.array(inputs).reshape(1, inputs.length).T as NdArray;
		const { finalOutputs } = this.forwardPropagation(inputMatrix);

		return finalOutputs;
	}


	/**
	 * Шаг обучения
	 * @param inputs {number[]} входные сигналы
	 * @param targets {number[]} ожидаемый результат
	 */
	private trainStep(inputs: number[], targets: number[]): void {
		const inputMatrix = nj.array(inputs, "float64").reshape(1, inputs.length).T as NdArray;
		const targetMatrix = nj.array(targets, "float64").reshape(1, targets.length).T as NdArray;

		const forwardResult = this.forwardPropagation(inputMatrix);
		this.backPropagation(inputMatrix, targetMatrix, forwardResult);
	}

	/**
	 * Генерируем начаьную матрицу весов
	 * @param rows {number} Количество строк
	 * @param columns {number} Количество столбцов
	 * @returns {NdArray}
	 */
	private generateWeights(rows: number, columns: number): NdArray {
		return nj.random([rows, columns]).subtract(0.5);
	}

	/**
	 * Подсчитываем дополнительные веса
	 * @param inputs {NdArray}
	 * @param outputs {NdArray}
	 * @param errors {NdArray}
	 * @returns {NdArray}
	 */
	private calcAdditionalWeights(inputs: NdArray, outputs: NdArray, errors: NdArray): NdArray {
		const ones = nj.ones(outputs.shape) as NdArray;
		const arg1 = errors.multiply(outputs).multiply(nj.subtract(ones, outputs));
		const arg2 = inputs.T;

		return nj.dot(arg1, arg2).multiply(this.LR);
	}


	/**
	 * Прямое распространение сигнала
	 * @param inputMatrix {NdArray} Входные сигналы, приобразованные в двумерный массив
	 * @returns {IForwardResult}
	 */
	private forwardPropagation(inputMatrix: NdArray): IForwardResult {
		const hiddenInputs = this.weightsIH.dot(inputMatrix);
		const hiddenOutputs = this.activator.execute(hiddenInputs);

		const finalInputs = this.weightsHO.dot(hiddenOutputs);
		const finalOutputs = this.activator.execute(finalInputs);

		return {
			hiddenOutputs,
			finalOutputs
		};
	}


	/**
	 * Обратное распространение ошибки
	 * @param inputMatrix {NdArray} Входные сигналы, приобразованные в двумерный массив
	 * @param targetMatrix {NdArray} Ожидаемые результаты, приобразованные в двумерный массив
	 * @param result {IForwardResult} Объект с выходными сигналами на слоях после прямого прохода
	 */
	private backPropagation(inputMatrix: NdArray, targetMatrix: NdArray, result: IForwardResult): void {
		const { hiddenOutputs, finalOutputs } = result;
		const outputErrors = targetMatrix.subtract(finalOutputs);
		const hiddenErrors = this.weightsHO.T.dot(outputErrors);
		const additionalHO = this.calcAdditionalWeights(hiddenOutputs, finalOutputs, outputErrors);
		const additionalIH = this.calcAdditionalWeights(inputMatrix, hiddenOutputs, hiddenErrors);

		this.weightsHO = this.weightsHO.add(additionalHO);
		this.weightsIH = this.weightsIH.add(additionalIH);
	}
}
