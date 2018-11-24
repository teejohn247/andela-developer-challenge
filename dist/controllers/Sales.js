"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _conn = require("../models/conn");

var _conn2 = _interopRequireDefault(_conn);

var _Helper = require("../helper/Helper");

var _Helper2 = _interopRequireDefault(_Helper);

var _fs = require("fs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Sale {

	static async getSale(req, res) {
		if (req.user.id != req.params.id) {
			return res.status(404).send({ Error: "You do not have access to view these records" });
		}
		const userRole = req.user.role;
		if (userRole === 'attendant') {
			const text = "SELECT * FROM salesitems WHERE user_id = $1";
			try {
				const { rows } = await _conn2.default.query(text, [req.params.id]);
				if (!rows[0]) {
					return _Helper2.default.noSalesRecord(res);
				}
				return res.status(200).send({ rows });
			} catch (error) {
				return res.status(400).send(error);
			}
		}return res.status(401).send({ Message: 'Unauthorised Action' });
	}

	static async createSales(req, res) {
		const userRole = req.user.role;
		// fetch the request data
		const salePrice = req.body.price;
		const result = _Helper2.default.validateAttendant({ sale_price: salePrice });
		if (userRole === "attendant") {
			if (result.error) {
				return _Helper2.default.invalidDataMsg(res, result.error);
			}
			const salesInfoQuery = "INSERT INTO salesinfo (price) VALUES ($1) returning *";
			const salesInfoValues = [req.body.price];
			const updateUserSale = "UPDATE users SET sales = sales + ($1) WHERE id = ($2)";
			const updateUserSaleValues = [req.body.price, req.user.id];
			try {
				await _conn2.default.query(updateUserSale, updateUserSaleValues);
			} catch (error) {
				console.log(res.status(400).send({ Error: error }));
			}
			try {
				const createdSalesInfo = await _conn2.default.query(salesInfoQuery, salesInfoValues);
				const salesId = createdSalesInfo.rows[0].id;
				const resultArray = [req.body.price, salesId];
				for (let index = 0; index < req.body.salesArray.length; index++) {
					const result = _Helper2.default.validateSale(req.body.salesArray[index]);
					if (result.error) {
						return _Helper2.default.invalidDataMsg(res, result.error);
					}
					let salesItemsQuery = "INSERT INTO salesitems (product_id,sale_id,quantity,item_price,user_id) VALUES ($1,$2,$3,$4,$5) returning *";
					let salesItemValues = [req.body.salesArray[index].product_id, salesId, req.body.salesArray[index].quantity, req.body.salesArray[index].item_price, req.user.id];
					let createdSalesItem = await _conn2.default.query(salesItemsQuery, salesItemValues);
					resultArray.push(createdSalesItem.rows[0]);
				}
				return res.status(201).send({ resultArray });
			} catch (error) {
				console.log(res.status(422).send(error));
			}
		} else {
			return res.status(401).send({ Message: "Unauthorised Action" });
		}
	}

	static async getAllSales(req, res) {
		const userRole = req.user.role;
		if (userRole === "admin") {
			const salesByAttendant = "select email,product_id,sale_id,quantity,item_price,user_id FROM users inner join salesitems on users.id = salesitems.user_id";
			const salesByProductName = "select name FROM products inner join salesitems on products.id = salesitems.product_id";
			try {
				const attendantSale = await _conn2.default.query(salesByAttendant);
				const productNameSale = await _conn2.default.query(salesByProductName);
				for (let index = 0; index < attendantSale.rows.length; index++) {
					//for each sales object, add a product name attribute
					attendantSale.rows[index].product_name = productNameSale.rows[index].name;
				}
				return res.status(200).send({ Sales_Info: attendantSale.rows });
			} catch (error) {
				return res.status(400).send({ error });
			}
		}
		return res.status(401).send({ Message: "Unauthorised Action" });
	}

	static async deleteSale(req, res) {
		const userRole = req.user.role;
		// if (userRole === 'admin') {
		const text = "DELETE FROM salesitems WHERE id = $1";
		try {
			const result = await _conn2.default.query(text, [req.params.id]);
			if (result.rowCount == 0) {
				return res.status(404).send({ Message: "Record does not exist" });
			}
			return res.status(200).send({ Message: "Record deleted successfully" });
		} catch (error) {
			return res.status(400).send(error);
		}
		// } return res.status(401).send({ Message: 'Unauthorised Action' });
	}
}

exports.default = Sale;